/**
 * HYPER-RES 8K // Viral TikTok Video Enhancer Web Controller
 */

// Application State
const state = {
  sourceType: 'url',
  videoUrl: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
  fileName: '',
  preset: 'viral_tiktok_hdr',
  resolution: '4k',
  fps: 60,
  motionMode: 'blend',
  sharpness: 0.75,
  contrast: 1.18,
  bloom: true,
  codec: 'h264',
};

const presetConfig = {
  viral_tiktok_hdr: {
    sharpness: 0.75,
    contrast: 1.18,
    bloom: true,
    fps: 60,
    resolution: '4k',
  },
  velocity_flow_60fps: {
    sharpness: 0.65,
    contrast: 1.12,
    bloom: true,
    fps: 60,
    resolution: '4k',
  },
  alight_motion_dark: {
    sharpness: 0.85,
    contrast: 1.25,
    bloom: true,
    fps: 60,
    resolution: '4k',
  },
  cyberpunk_neon: {
    sharpness: 0.90,
    contrast: 1.22,
    bloom: true,
    fps: 60,
    resolution: '4k',
  },
  raw_master_8k: {
    sharpness: 0.50,
    contrast: 1.06,
    bloom: false,
    fps: 60,
    resolution: '8k',
  },
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initComparisonSlider();
  initDropzone();
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
    state.bloom = conf.bloom;
    state.fps = conf.fps;
    state.resolution = conf.resolution;

    // Update controls
    document.getElementById('slider-sharpness').value = conf.sharpness;
    document.getElementById('val-sharpness').textContent = conf.sharpness.toFixed(2);

    document.getElementById('slider-contrast').value = conf.contrast;
    document.getElementById('val-contrast').textContent = `${conf.contrast.toFixed(2)}x`;

    document.getElementById('toggle-bloom').checked = conf.bloom;

    // Update pill buttons
    setResolution(conf.resolution, false);
    setFps(conf.fps, false);
  }

  updateGeneratedCommand();
}

// Control Handlers
function setResolution(res, updateCmd = true) {
  state.resolution = res;
  const container = document.getElementById('res-selector');
  Array.from(container.children).forEach((btn) => {
    btn.classList.toggle('active', btn.textContent.toLowerCase().includes(res));
  });
  if (updateCmd) updateGeneratedCommand();
}

function setFps(fps, updateCmd = true) {
  state.fps = fps;
  const container = document.getElementById('fps-selector');
  Array.from(container.children).forEach((btn) => {
    btn.classList.toggle('active', btn.textContent.includes(fps.toString()));
  });
  document.getElementById('preview-fps-tag').textContent = `${fps} FPS ACTIVE`;
  if (updateCmd) updateGeneratedCommand();
}

function setCodec(codec) {
  state.codec = codec;
  const container = document.getElementById('codec-selector');
  Array.from(container.children).forEach((btn) => {
    btn.classList.toggle('active', btn.textContent.toLowerCase().includes(codec));
  });
  updateGeneratedCommand();
}

function updateParam(param, val) {
  const num = parseFloat(val);
  if (param === 'sharpness') {
    state.sharpness = num;
    document.getElementById('val-sharpness').textContent = num.toFixed(2);
  } else if (param === 'contrast') {
    state.contrast = num;
    document.getElementById('val-contrast').textContent = `${num.toFixed(2)}x`;
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
  let cmd = `python core/pipeline.py -i "${inputTarget}" -p ${state.preset} -r ${state.resolution} -fps ${state.fps} -m ${state.motionMode} --codec ${state.codec}`;
  
  if (!state.bloom) cmd += ' --no-bloom';
  if (state.sharpness !== presetConfig[state.preset]?.sharpness) {
    cmd += ` --sharpness ${state.sharpness.toFixed(2)}`;
  }
  if (state.contrast !== presetConfig[state.preset]?.contrast) {
    cmd += ` --contrast ${state.contrast.toFixed(2)}`;
  }
  return cmd;
}

function updateGeneratedCommand() {
  const codeEl = document.getElementById('generated-cli-code');
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

// Drag & Drop
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
  state.fileName = `inputs/${file.name}`;
  const badge = document.getElementById('uploaded-filename-badge');
  badge.textContent = `Selected: ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)`;
  badge.style.display = 'inline-block';
  showToast(`Loaded: ${file.name}`);
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

  // Touch Support for Mobile Phones
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

// GitHub Actions Modal & Dispatch
function openGitHubModal() {
  const modal = document.getElementById('github-modal');
  const preview = document.getElementById('dispatch-payload-preview');

  const payload = {
    ref: 'main',
    inputs: {
      video_url: state.sourceType === 'url' ? state.videoUrl : '',
      preset: state.preset,
      resolution: state.resolution,
      fps: state.fps.toString(),
      motion_mode: state.motionMode,
      sharpness: state.sharpness.toString(),
      bloom: state.bloom,
      codec: state.codec,
    },
  };

  preview.textContent = JSON.stringify(payload, null, 2);
  modal.classList.add('active');
}

function closeGitHubModal() {
  document.getElementById('github-modal').classList.remove('active');
}

async function submitGitHubDispatch() {
  const repo = document.getElementById('gh-repo-input').value.trim();
  const pat = document.getElementById('gh-pat-input').value.trim();

  if (!repo) {
    alert('Please enter your GitHub Repository (e.g. username/ULTRA-HIGH-RESOLUTION-TOOL)');
    return;
  }

  if (!pat) {
    // If no PAT, guide the user to GitHub's web interface or copy gh CLI command
    const ghCmd = `gh workflow run enhance_video.yml --repo ${repo} -f preset=${state.preset} -f resolution=${state.resolution} -f fps=${state.fps} -f video_url="${state.videoUrl}"`;
    navigator.clipboard.writeText(ghCmd);
    alert(`No PAT provided! Copied GitHub CLI command to clipboard:\n\n${ghCmd}\n\nOr trigger directly from your repo's Actions tab.`);
    closeGitHubModal();
    return;
  }

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
          bloom: state.bloom,
          codec: state.codec,
        },
      }),
    });

    if (response.ok || response.status === 204) {
      alert('🚀 Workflow successfully triggered in GitHub Actions! Check your Actions tab.');
      closeGitHubModal();
    } else {
      const err = await response.json().catch(() => ({ message: response.statusText }));
      alert(`Dispatch failed: ${err.message || 'Check repository and token permissions.'}`);
    }
  } catch (e) {
    alert(`Error dispatching workflow: ${e.message}`);
  } finally {
    btn.textContent = 'Launch Cloud Enhancer 🚀';
    btn.disabled = false;
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
