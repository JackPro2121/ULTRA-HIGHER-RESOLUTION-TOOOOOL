"""FFmpeg Filtergraph Builder for 8K / 60-480 FPS Viral Enhancements.

Constructs complex multi-stage filtergraphs combining:
1. Spatio-temporal Denoising (hqdn3d)
2. High-Precision Lanczos Resampling (Aspect Ratio Aware)
3. AMD FidelityFX CAS (Contrast Adaptive Sharpening)
4. Dual-Pass Unsharp Edge Extraction
5. S-Curve Dynamic Contrast & Vibrance EQ
6. Specular Highlight Bloom & Glow (Split + Blur + Additive Blend)
7. Butter Motion Flow (60/120 FPS Motion Interpolation / Blending)
"""

from typing import Dict, Any, Tuple, Optional


def build_filtergraph(
    preset: Dict[str, Any],
    input_width: int,
    input_height: int,
    target_resolution: str = "4k",
    target_fps: int = 60,
    motion_mode: str = "blend",
    enable_bloom: bool = True,
    cas_override: Optional[float] = None,
    contrast_override: Optional[float] = None,
    saturation_override: Optional[float] = None,
) -> Tuple[str, int, int]:
    """
    Build a complete FFmpeg filtergraph string and return (filtergraph_str, out_w, out_h).
    """
    # 1. Determine Target Dimensions based on aspect ratio
    is_portrait = input_height >= input_width
    res_key = target_resolution.lower()
    
    if res_key == "8k":
        base_w, base_h = (4320, 7680) if is_portrait else (7680, 4320)
    elif res_key == "4k":
        base_w, base_h = (2160, 3840) if is_portrait else (3840, 2160)
    elif res_key == "2k":
        base_w, base_h = (1440, 2560) if is_portrait else (2560, 1440)
    else:  # 1080p
        base_w, base_h = (1080, 1920) if is_portrait else (1920, 1080)

    # Scale filter with aspect ratio preservation and 2-pixel alignment
    scale_filter = (
        f"scale={base_w}:{base_h}:force_original_aspect_ratio=decrease,"
        f"pad={base_w}:{base_h}:(ow-iw)/2:(oh-ih)/2:black,"
        f"setsar=1"
    )

    # Parameters
    cas_strength = cas_override if cas_override is not None else preset.get("cas_strength", 0.75)
    unsharp_luma = preset.get("unsharp_luma", 1.2)
    unsharp_chroma = preset.get("unsharp_chroma", 0.8)
    denoise_luma = preset.get("denoise_luma", 1.5)
    denoise_chroma = preset.get("denoise_chroma", 3.0)
    
    contrast = contrast_override if contrast_override is not None else preset.get("contrast", 1.18)
    saturation = saturation_override if saturation_override is not None else preset.get("saturation", 1.25)
    brightness = preset.get("brightness", 0.01)
    gamma = preset.get("gamma", 0.96)
    s_curve = preset.get("s_curve", "0/0 0.22/0.16 0.50/0.50 0.78/0.86 1/1")

    # Step-by-step filter assembly
    filters = []

    # A. Noise reduction before sharpening to prevent grain explosion
    filters.append(f"hqdn3d=luma_spatial={denoise_luma}:chroma_spatial={denoise_chroma}:luma_tmp=3:chroma_tmp=3")

    # B. High precision upscale
    filters.append(scale_filter)

    # C. AMD FidelityFX CAS (Contrast Adaptive Sharpening)
    filters.append(f"cas=strength={cas_strength:.2f}")

    # D. Dual-Pass Unsharp Mask for micro-edge clarity
    filters.append(f"unsharp=lx=5:ly=5:la={unsharp_luma:.2f}:cx=5:cy=5:ca={unsharp_chroma:.2f}")

    # E. Color Correction & S-Curve Tone Mapping
    filters.append(f"eq=contrast={contrast:.2f}:brightness={brightness:.2f}:saturation={saturation:.2f}:gamma={gamma:.2f}")
    filters.append(f"curves=all='{s_curve}'")

    # F. Color Balance (if specified in preset)
    if "color_balance" in preset:
        cb = preset["color_balance"]
        filters.append(f"colorbalance=rs={cb.get('rs', 0)}:gs={cb.get('gs', 0)}:bs={cb.get('bs', 0)}:rh={cb.get('rh', 0)}:gh={cb.get('gh', 0)}:bh={cb.get('bh', 0)}")

    current_chain = ",".join(filters)

    # G. Highlight Bloom & Glow Sub-Pipeline
    use_bloom = enable_bloom and preset.get("bloom_enabled", True)
    if use_bloom:
        thresh = preset.get("bloom_threshold", 0.65)
        blur = preset.get("bloom_blur", 15.0)
        opacity = preset.get("bloom_opacity", 0.28)
        
        # Split stream into base and bloom extraction, isolate highlights, gaussian blur, additive blend
        complex_graph = (
            f"[0:v]{current_chain},split=2[base][glow_src];"
            f"[glow_src]format=gbrp,curves=all='0/0 {thresh}/0 1/1',gblur=sigma={blur:.1f}[glow];"
            f"[base][glow]blend=all_mode=addition:all_opacity={opacity:.2f}[graded]"
        )
        post_label = "[graded]"
    else:
        complex_graph = f"[0:v]{current_chain}[graded]"
        post_label = "[graded]"

    # H. Motion Interpolation / High FPS Flow
    final_chain = []
    if target_fps and target_fps > 30:
        if motion_mode == "mci":
            final_chain.append(f"minterpolate=fps={target_fps}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1")
        elif motion_mode == "blend":
            # Butter smooth motion flow with temporal blending
            final_chain.append(f"minterpolate=fps={target_fps}:mi_mode=blend")
        else:
            final_chain.append(f"framerate=fps={target_fps}")

    final_chain.append("format=yuv420p")
    
    if final_chain:
        complex_graph += f";{post_label}{','.join(final_chain)}[outv]"
    else:
        complex_graph += f";{post_label}format=yuv420p[outv]"

    return complex_graph, base_w, base_h
