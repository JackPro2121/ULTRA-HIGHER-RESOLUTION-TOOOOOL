/**
 * HYPER-RES PRO // 12K & 480 FPS Viral Video Dashboard Controller
 */

// Application State
const state = {
  sourceType: 'file',
  videoUrl: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
  fileName: '',
  fileObject: null,
  preset: 'tiktok_4k_120fps',
  resolution: '4k',
  fps: 120,
  motionMode: 'blend',
  sharpness: 0.75,
  contrast: 1.16,
  saturation: 1.25,
  brightness: 0.01,
  denoise: 1.5,
  bitrate: 75,
  bloom: true,
  codec: 'h264',
  githubRepo: 'JackPro2121/ULTRA-HIGHER-RESOLUTION-TOOOOOL',
  githubPat: localStorage.getItem('hyper_res_gh_pat') || '',
};

const presetConfig = {
  tiktok_4k_120fps: {
    title: 'TikTok 4K 120 FPS',
    specs: '4K UHD • 120 FPS • 75 Mbps • H.264',
    sharpness: 0.75,
    contrast: 1.16,
    saturation: 1.25,
    brightness: 0.01,
    denoise: 1.5,
    bloom: true,
    fps: 120,
    resolution: '4k',
    bitrate: 75,
    codec: 'h264',
  },
  instagram_reels_hdr: {
    title: 'Instagram Reels 4K HDR',
    specs: '4K UHD • 60 FPS • 65 Mbps • H.264',
    sharpness: 0.80,
    contrast: 1.20,
    saturation: 1.32,
    brightness: 0.01,
    denoise: 1.4,
    bloom: true,
    fps: 60,
    resolution: '4k',
    bitrate: 65,
    codec: 'h264',
  },
  low_light_indoor_fix: {
    title: 'Indoor / Low-Light Fix',
    specs: '4K UHD • 60 FPS • Heavy Denoise • Lifted Shadows',
    sharpness: 0.60,
    contrast: 1.08,
    saturation: 1.15,
    brightness: 0.02,
    denoise: 2.6,
    bloom: true,
    fps: 60,
    resolution: '4k',
    bitrate: 65,
    codec: 'h264',
  },
  velocity_flow_480fps: {
    title: 'Velocity Flow 480 FPS',
    specs: '4K UHD • 480 FPS • 80 Mbps • Shutter Blur',
    sharpness: 0.70,
    contrast: 1.14,
    saturation: 1.20,
    brightness: 0.00,
    denoise: 1.8,
    bloom: true,
    fps: 480,
    resolution: '4k',
    bitrate: 80,
    codec: 'h264',
  },
  youtube_shorts_8k: {
    title: 'YouTube Shorts 8K',
    specs: '8K Master • 60 FPS • 95 Mbps • H.264',
    sharpness: 0.55,
    contrast: 1.10,
    saturation: 1.12,
    brightness: 0.00,
    denoise: 1.2,
    bloom: false,
    fps: 60,
    resolution: '8k',
    bitrate: 95,
    codec: 'h264',
  },
  alight_motion_dark: {
    title: 'Alight Motion Dark',
    specs: '4K UHD • 60 FPS • 60 Mbps • Crushed Blacks',
    sharpness: 0.85,
    contrast: 1.25,
    saturation: 1.35,
    brightness: -0.02,
    denoise: 1.2,
    bloom: true,
    fps: 60,
    resolution: '4k',
    bitrate: 60,
    codec: 'h264',
  },
  cyberpunk_neon: {
    title: 'Cyberpunk Neon',
    specs: '4K UHD • 60 FPS • 65 Mbps • Cyan/Amber',
    sharpness: 0.90,
    contrast: 1.22,
    saturation: 1.30,
    brightness: 0.01,
    denoise: 1.5,
    bloom: true,
    fps: 60,
    resolution: '4k',
    bitrate: 65,
    codec: 'h264',
  },
  extreme_phone_killer_12k: {
    title: '12K Benchmark Master',
    specs: '12K (74.6 MP) • 120 Mbps • H.265 Master',
    sharpness: 0.92,
    contrast: 1.25,
    saturation: 1.35,
    brightness: 0.01,
    denoise: 1.2,
    bloom: true,
    fps: 60,
    resolution: '12k',
    bitrate: 120,
    codec: 'h265',
  },
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initComparisonSlider();
  initDropzone();
  selectPreset('tiktok_4k_120fps');
  updateGeneratedCommand();
});

// Tab Switching
function switchTab(type) {
  state.sourceType = type;
  document.getElementById('tab-url-btn').classList.toggle('active', type === 'url');
  document.getElementById('tab-file-btn').classList.toggle('active', type === 'file');
  document.getElementById('tab-url-content').classList.toggle('active', type === 'url');
  document.getElementById('tab-file-content').classList.toggle('active', type === 'file');
  updateGeneratedCommand();
}

function handleLoadUrl() {
  const url = document.getElementById('input-video-url').value.trim();
  if (url) {
    state.videoUrl = url;
    showToast('Video URL loaded into pipeline!');
    updateGeneratedCommand();
  }
}

// Preset Selection
function selectPreset(presetId) {
  state.preset = presetId;

  // Update card UI
  document.querySelectorAll('.preset-card').forEach((card) => {
    card.classList.toggle('active', card.id === `preset-${presetId}`);
  });

  // Load preset defaults
  const conf = presetConfig[presetId];
  if (conf) {
    state.sharpness = conf.sharpness;
    state.contrast = conf.contrast;
    state.saturation = conf.saturation;
    state.brightness = conf.brightness;
    state.denoise = conf.denoise;
    state.bloom = conf.bloom;
    state.fps = conf.fps;
    state.resolution = conf.resolution;
    state.bitrate = conf.bitrate;
    state.codec = conf.codec;

    // Update Quick Continue bar
    const nameEl = document.getElementById('continue-preset-name');
    const badgeEl = document.getElementById('continue-specs-badge');
    if (nameEl) nameEl.textContent = conf.title;
    if (badgeEl) badgeEl.textContent = conf.specs;

    // Update sliders
    const sSharp = document.getElementById('slider-sharpness');
    if (sSharp) {
      sSharp.value = conf.sharpness;
      document.getElementById('val-sharpness').textContent = conf.sharpness.toFixed(2);
    }

    const sContrast = document.getElementById('slider-contrast');
    if (sContrast) {
      sContrast.value = conf.contrast;
      document.getElementById('val-contrast').textContent = `${conf.contrast.toFixed(2)}x`;
    }

    const sSat = document.getElementById('slider-saturation');
    if (sSat) {
      sSat.value = conf.saturation;
      document.getElementById('val-saturation').textContent = `${conf.saturation.toFixed(2)}x`;
    }

    const sBright = document.getElementById('slider-brightness');
    if (sBright) {
      sBright.value = conf.brightness;
      document.getElementById('val-brightness').textContent = (conf.brightness >= 0 ? '+' : '') + conf.brightness.toFixed(2);
    }

    const sBitrate = document.getElementById('slider-bitrate');
    if (sBitrate) {
      sBitrate.value = conf.bitrate;
      document.getElementById('val-bitrate').textContent = `${conf.bitrate} Mbps`;
    }

    const tBloom = document.getElementById('toggle-bloom');
    if (tBloom) tBloom.checked = conf.bloom;

    // Update selectors
    setResolution(conf.resolution, false);
    setFps(conf.fps, false);
    setCodec(conf.codec, false);
    setDenoise(conf.denoise, false);
  }

  updateGeneratedCommand();
}

// Collapsible Pro Controls Accordion
function toggleProControls() {
  const container = document.getElementById('pro-controls-container');
  const icon = document.getElementById('pro-controls-icon');
  if (container) {
    const isHidden = container.style.display === 'none';
    container.style.display = isHidden ? 'flex' : 'none';
    if (icon) icon.classList.toggle('rotated', !isHidden);
  }
}

// Denoise Selection
function setDenoise(val, updateCmd = true) {
  state.denoise = parseFloat(val);
  const container = document.getElementById('denoise-selector');
  if (container) {
    Array.from(container.children).forEach((btn) => {
      btn.classList.toggle('active', btn.textContent.includes(val.toString()));
    });
  }
  if (updateCmd) updateGeneratedCommand();
}

// Resolution Selection
function setResolution(res, updateCmd = true) {
  state.resolution = res;
  document.querySelectorAll('.res-card').forEach((card) => {
    const isTarget = card.querySelector('.res-tag').textContent.toLowerCase().includes(res);
    card.classList.toggle('active', isTarget);
  });
  
  const upscaleEl = document.getElementById('spec-upscale');
  if (upscaleEl) upscaleEl.textContent = res.toUpperCase();

  if (updateCmd) updateGeneratedCommand();
}

// Framerate Selection
function setFps(fps, updateCmd = true) {
  state.fps = fps;
  const container = document.getElementById('fps-selector');
  if (container) {
    Array.from(container.children).forEach((btn) => {
      btn.classList.toggle('active', btn.textContent.includes(fps.toString()));
    });
  }
  const fpsBadge = document.getElementById('preview-fps-tag');
  if (fpsBadge) fpsBadge.textContent = `${fps} FPS FLOW`;
  if (updateCmd) updateGeneratedCommand();
}

function setCodec(codec, updateCmd = true) {
  state.codec = codec;
  const container = document.getElementById('codec-selector');
  if (container) {
    Array.from(container.children).forEach((btn) => {
      btn.classList.toggle('active', btn.textContent.toLowerCase().includes(codec));
    });
  }
  if (updateCmd) updateGeneratedCommand();
}

function updateParam(param, val) {
  const num = parseFloat(val);
  if (param === 'sharpness') {
    state.sharpness = num;
    document.getElementById('val-sharpness').textContent = num.toFixed(2);
  } else if (param === 'contrast') {
    state.contrast = num;
    document.getElementById('val-contrast').textContent = `${num.toFixed(2)}x`;
  } else if (param === 'saturation') {
    state.saturation = num;
    document.getElementById('val-saturation').textContent = `${num.toFixed(2)}x`;
  } else if (param === 'brightness') {
    state.brightness = num;
    document.getElementById('val-brightness').textContent = (num >= 0 ? '+' : '') + num.toFixed(2);
  } else if (param === 'bitrate') {
    state.bitrate = parseInt(val, 10);
    document.getElementById('val-bitrate').textContent = `${state.bitrate} Mbps`;
  }
  updateGeneratedCommand();
}

function updateBloomToggle(isChecked) {
  state.bloom = isChecked;
  updateGeneratedCommand();
}

// CLI Command Builder
function getCliCommand() {
  const inputTarget = state.sourceType === 'url' ? state.videoUrl : (state.fileName || 'inputs/my_mobile_video.mp4');
  let cmd = `python core/pipeline.py -i "${inputTarget}" -p ${state.preset} -r ${state.resolution} -fps ${state.fps} -m ${state.motionMode} --bitrate ${state.bitrate} --codec ${state.codec}`;
  
  if (!state.bloom) cmd += ' --no-bloom';
  if (state.sharpness !== presetConfig[state.preset]?.sharpness) {
    cmd += ` --sharpness ${state.sharpness.toFixed(2)}`;
  }
  if (state.contrast !== presetConfig[state.preset]?.contrast) {
    cmd += ` --contrast ${state.contrast.toFixed(2)}`;
  }
  if (state.saturation !== presetConfig[state.preset]?.saturation) {
    cmd += ` --saturation ${state.saturation.toFixed(2)}`;
  }
  if (state.brightness !== presetConfig[state.preset]?.brightness) {
    cmd += ` --brightness ${state.brightness.toFixed(2)}`;
  }
  if (state.denoise !== presetConfig[state.preset]?.denoise) {
    cmd += ` --denoise ${state.denoise.toFixed(1)}`;
  }
  return cmd;
}

function updateGeneratedCommand() {
  const codeEl = document.getElementById('generated-command') || document.getElementById('generated-cli-code');
  if (codeEl) {
    codeEl.textContent = getCliCommand();
  }
}

function copyCliCommand() {
  const cmd = getCliCommand();
  navigator.clipboard.writeText(cmd).then(() => {
    showToast('FFmpeg Pipeline command copied to clipboard!');
  });
}

// Drag & Drop & Metadata Inspector
function initDropzone() {
  const dropzone = document.getElementById('video-dropzone');
  const fileInput = document.getElementById('file-input');

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
      handleFile(e.target.files[0]);
    }
  });
}

function handleFile(file) {
  state.fileObject = file;
  state.fileName = `inputs/${file.name}`;

  // Update Inspector Card
  document.getElementById('spec-name').textContent = file.name;
  const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
  const sizeText = file.size > 1024 * 1024 * 1024 
    ? `${(file.size / (1024 * 1024 * 1024)).toFixed(2)} GB` 
    : `${sizeMb} MB`;
  document.getElementById('spec-size').textContent = sizeText;

  // Inspect video dimensions in browser via HTML5 Video
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.onloadedmetadata = function() {
    window.URL.revokeObjectURL(video.src);
    const w = video.videoWidth;
    const h = video.videoHeight;
    const durSec = Math.round(video.duration);
    const mins = Math.floor(durSec / 60);
    const secs = durSec % 60;
    const durStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    document.getElementById('spec-res').textContent = `${w} x ${h}`;
    document.getElementById('spec-dur').textContent = durStr;
    document.getElementById('inspector-card').style.display = 'flex';
  };
  video.src = URL.createObjectURL(file);

  // Auto-stream upload to local inputs/ directory if running on local server
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    const progContainer = document.getElementById('upload-progress-container');
    const progBar = document.getElementById('upload-progress-bar');
    const statusText = document.getElementById('upload-status-text');
    const percentText = document.getElementById('upload-percent-text');

    if (progContainer) progContainer.style.display = 'block';
    if (statusText) statusText.textContent = `Streaming ${file.name} to disk...`;

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/upload?filename=${encodeURIComponent(file.name)}`, true);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        if (progBar) progBar.style.width = `${pct}%`;
        if (percentText) percentText.textContent = `${pct}%`;
      }
    };
    xhr.onload = () => {
      if (progContainer) {
        if (statusText) statusText.textContent = `✅ Saved to inputs/${file.name}`;
        setTimeout(() => { progContainer.style.display = 'none'; }, 2000);
      }
      showToast(`Saved to inputs/${file.name}`);
    };
    xhr.send(file);
  }

  showToast(`Loaded ${file.name} (${sizeText})`);
  updateGeneratedCommand();
}

// Interactive Before / After Split Slider
function initComparisonSlider() {
  const stage = document.getElementById('comparison-stage');
  const stageBefore = document.getElementById('stage-before');
  const splitDivider = document.getElementById('split-divider');

  let isDragging = false;

  const moveSlider = (clientX) => {
    const rect = stage.getBoundingClientRect();
    let x = clientX - rect.left;
    x = Math.max(0, Math.min(x, rect.width));
    const percent = (x / rect.width) * 100;

    stageBefore.style.width = `${percent}%`;
    splitDivider.style.left = `${percent}%`;
  };

  stage.addEventListener('mousedown', (e) => {
    isDragging = true;
    moveSlider(e.clientX);
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    moveSlider(e.clientX);
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  stage.addEventListener('touchstart', (e) => {
    isDragging = true;
    if (e.touches.length) moveSlider(e.touches[0].clientX);
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (!isDragging || !e.touches.length) return;
    moveSlider(e.touches[0].clientX);
  }, { passive: true });

  window.addEventListener('touchend', () => {
    isDragging = false;
  });
}

// GitHub Actions Modal & Cloud Dispatch
function openGitHubModal() {
  const modal = document.getElementById('github-modal');
  const preview = document.getElementById('dispatch-payload-preview');
  const patInput = document.getElementById('gh-pat-input');
  
  const savedPat = localStorage.getItem('hyper_res_gh_pat');
  if (savedPat && patInput) {
    patInput.value = savedPat;
  }

  const payload = {
    ref: 'main',
    inputs: {
      video_url: state.sourceType === 'url' ? state.videoUrl : '',
      preset: state.preset,
      resolution: state.resolution,
      fps: state.fps.toString(),
      motion_mode: state.motionMode,
      sharpness: state.sharpness.toString(),
      bitrate: state.bitrate.toString(),
      bloom: state.bloom,
      codec: state.codec,
    },
  };

  preview.textContent = JSON.stringify(payload, null, 2);
  modal.classList.add('active');
  const alertBox = document.getElementById('modal-alert-box');
  if (alertBox) alertBox.style.display = 'none';
}

function closeGitHubModal() {
  document.getElementById('github-modal').classList.remove('active');
}

function openGitHubActionsDirectly() {
  const repo = document.getElementById('gh-repo-input').value.trim() || state.githubRepo;
  const workflowUrl = `https://github.com/${repo}/actions/workflows/enhance_video.yml`;
  window.open(workflowUrl, '_blank');
  showToast('Opening GitHub Actions in new tab! Click "Run workflow"');
  closeGitHubModal();
}

async function submitGitHubDispatch() {
  const repo = document.getElementById('gh-repo-input').value.trim() || state.githubRepo;
  const pat = document.getElementById('gh-pat-input').value.trim();
  const alertBox = document.getElementById('modal-alert-box');
  const alertText = document.getElementById('modal-alert-text');

  const showAlert = (msg) => {
    if (alertBox && alertText) {
      alertText.textContent = msg;
      alertBox.style.display = 'block';
    } else {
      alert(msg);
    }
  };

  if (!repo) {
    showAlert('Please enter your GitHub Repository name');
    return;
  }

  if (!pat) {
    showAlert('Please paste your Personal Access Token (PAT) starting with ghp_, or click "Run Directly on GitHub" above!');
    return;
  }

  localStorage.setItem('hyper_res_gh_pat', pat);
  if (alertBox) alertBox.style.display = 'none';

  const btn = document.getElementById('btn-submit-dispatch');
  btn.textContent = 'Dispatching to Cloud...';
  btn.disabled = true;

  try {
    const url = `https://api.github.com/repos/${repo}/actions/workflows/enhance_video.yml/dispatches`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${pat}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          video_url: state.sourceType === 'url' ? state.videoUrl : '',
          preset: state.preset,
          resolution: state.resolution,
          fps: state.fps.toString(),
          motion_mode: state.motionMode,
          sharpness: state.sharpness.toString(),
          bitrate: state.bitrate.toString(),
          bloom: state.bloom,
          codec: state.codec,
        },
      }),
    });

    if (response.ok || response.status === 204) {
      closeGitHubModal();
      showToast('🚀 Workflow successfully dispatched to GitHub Actions!');
      startLiveMonitor(repo, pat);
    } else {
      const err = await response.json().catch(() => ({ message: response.statusText }));
      if (response.status === 401 || (err.message && err.message.toLowerCase().includes('bad credentials'))) {
        showAlert('❌ Bad credentials: Token is invalid or expired. Please generate a new GitHub Token with "workflow" permission, or use the "Run Directly on GitHub" button above!');
      } else {
        showAlert(`Dispatch failed (${response.status}): ${err.message || 'Check permissions.'}`);
      }
    }
  } catch (e) {
    showAlert(`Error dispatching workflow: ${e.message}`);
  } finally {
    btn.textContent = 'Launch Cloud Master 🚀';
    btn.disabled = false;
  }
}

// Live Run Status Tracker
let monitorInterval = null;
let startTime = null;

function startLiveMonitor(repo, pat) {
  const monitorCard = document.getElementById('live-monitor-card');
  const statusText = document.getElementById('monitor-status-text');
  const timerText = document.getElementById('monitor-timer');
  const msgText = document.getElementById('monitor-msg');
  const actionsEl = document.getElementById('monitor-actions');
  const dlBtn = document.getElementById('btn-direct-download');

  monitorCard.style.display = 'flex';
  actionsEl.style.display = 'none';
  statusText.textContent = 'Workflow Dispatched &bull; Queued...';
  msgText.textContent = `Targeting ${state.resolution.toUpperCase()} @ ${state.fps} FPS master render on GitHub Actions.`;

  startTime = Date.now();
  if (monitorInterval) clearInterval(monitorInterval);

  monitorInterval = setInterval(async () => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const secs = (elapsed % 60).toString().padStart(2, '0');
    timerText.textContent = `${mins}:${secs}`;

    try {
      const res = await fetch(`https://api.github.com/repos/${repo}/actions/runs?per_page=1`, {
        headers: { 'Authorization': `Bearer ${pat}` }
      });
      if (res.ok) {
        const data = await res.json();
        const run = data.workflow_runs?.[0];
        if (run) {
          if (run.status === 'in_progress') {
            statusText.textContent = 'Processing Master Video on Cloud...';
          } else if (run.status === 'completed') {
            clearInterval(monitorInterval);
            if (run.conclusion === 'success') {
              statusText.textContent = '✅ Master Enhancement Completed!';
              msgText.textContent = 'Your ultra-high resolution master video is ready for download in GitHub Releases!';
              dlBtn.href = `https://github.com/${repo}/releases`;
              actionsEl.style.display = 'block';
            } else {
              statusText.textContent = '❌ Workflow Error';
              msgText.textContent = `Job finished with status: ${run.conclusion}. Check Actions tab for logs.`;
            }
          }
        }
      }
    } catch (e) {
      // Background poll
    }
// Local Execution Engine
async function runLocally() {
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    copyCliCommand();
    alert('You are running on a remote host (Vercel). To render locally, run `python dashboard_server.py` on your PC, or click "Dispatch on GitHub Actions" for free cloud render!');
    return;
  }

  const inputTarget = state.fileName || 'inputs/test_mobile_raw.mp4';
  const monitorCard = document.getElementById('live-monitor-card');
  const statusText = document.getElementById('monitor-status-text');
  const timerText = document.getElementById('monitor-timer');
  const msgText = document.getElementById('monitor-msg');
  const actionsEl = document.getElementById('monitor-actions');
  const dlBtn = document.getElementById('btn-direct-download');

  monitorCard.style.display = 'flex';
  actionsEl.style.display = 'none';
  statusText.textContent = '🚀 Local Master Render Started...';
  msgText.textContent = `Processing ${inputTarget} to ${state.resolution.toUpperCase()} @ ${state.fps} FPS master quality.`;

  const btnLocal = document.getElementById('btn-run-local');
  if (btnLocal) btnLocal.disabled = true;

  try {
    const res = await fetch('/api/enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input_path: inputTarget,
        preset: state.preset,
        resolution: state.resolution,
        fps: state.fps,
        motion_mode: state.motionMode,
        codec: state.codec,
        bloom: state.bloom,
        sharpness: state.sharpness,
        contrast: state.contrast,
        bitrate: state.bitrate,
      }),
    });

    const data = await res.json();
    if (!data.success) {
      statusText.textContent = '❌ Failed to start local job';
      if (btnLocal) btnLocal.disabled = false;
      return;
    }

    const jobId = data.job_id;
    const startT = Date.now();
    showToast('Local render running! Watch live monitor.');

    const localInterval = setInterval(async () => {
      const elapsed = Math.floor((Date.now() - startT) / 1000);
      const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const secs = (elapsed % 60).toString().padStart(2, '0');
      timerText.textContent = `${mins}:${secs}`;

      try {
        const sRes = await fetch(`/api/status?id=${jobId}`);
        const sData = await sRes.json();

        if (sData.status === 'COMPLETED') {
          clearInterval(localInterval);
          statusText.textContent = '✅ Local Master Render Complete!';
          msgText.textContent = `Output saved to: outputs/${sData.output_file}`;
          dlBtn.href = `/api/outputs`;
          dlBtn.target = '_blank';
          dlBtn.textContent = 'View in Outputs Folder';
          actionsEl.style.display = 'block';
          if (btnLocal) btnLocal.disabled = false;
          showToast('Master render completed!');
        } else if (sData.status === 'FAILED') {
          clearInterval(localInterval);
          statusText.textContent = '❌ Render Error';
          msgText.textContent = sData.error || 'Check terminal console for details.';
          if (btnLocal) btnLocal.disabled = false;
        }
      } catch (err) {
        // Poll
      }
    }, 2500);

  } catch (e) {
    statusText.textContent = '❌ Connection Error';
    msgText.textContent = e.message;
    if (btnLocal) btnLocal.disabled = false;
  }
}

// Toast helper
function showToast(message) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-msg');
  toastMsg.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}
