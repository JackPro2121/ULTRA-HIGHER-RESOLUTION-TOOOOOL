/**
 * HYPER-RES PRO // 12K & 480 FPS Viral Video Dashboard Controller
 */

// Application State
const state = {
  sourceType: 'file',
  videoUrl: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
  fileName: '',
  fileObject: null,
  preset: 'viral_tiktok_hdr',
  resolution: '4k',
  fps: 60,
  motionMode: 'blend',
  sharpness: 0.75,
  contrast: 1.18,
  bitrate: 55,
  bloom: true,
  codec: 'h264',
  githubRepo: 'JackPro2121/ULTRA-HIGHER-RESOLUTION-TOOOOOL',
  githubPat: localStorage.getItem('hyper_res_gh_pat') || '',
};

const presetConfig = {
  viral_tiktok_hdr: {
    sharpness: 0.75,
    contrast: 1.18,
    bloom: true,
    fps: 60,
    resolution: '4k',
    bitrate: 55,
  },
  velocity_flow_60fps: {
    sharpness: 0.65,
    contrast: 1.12,
    bloom: true,
    fps: 480,
    resolution: '4k',
    bitrate: 65,
  },
  alight_motion_dark: {
    sharpness: 0.85,
    contrast: 1.25,
    bloom: true,
    fps: 60,
    resolution: '4k',
    bitrate: 60,
  },
  cyberpunk_neon: {
    sharpness: 0.90,
    contrast: 1.22,
    bloom: true,
    fps: 60,
    resolution: '4k',
    bitrate: 65,
  },
  raw_master_8k: {
    sharpness: 0.50,
    contrast: 1.06,
    bloom: false,
    fps: 60,
    resolution: '8k',
    bitrate: 80,
  },
  extreme_phone_killer_12k: {
    sharpness: 0.92,
    contrast: 1.25,
    bloom: true,
    fps: 60,
    resolution: '12k',
    bitrate: 120,
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
    state.bitrate = conf.bitrate;

    // Update controls
    document.getElementById('slider-sharpness').value = conf.sharpness;
    document.getElementById('val-sharpness').textContent = conf.sharpness.toFixed(2);

    document.getElementById('slider-contrast').value = conf.contrast;
    document.getElementById('val-contrast').textContent = `${conf.contrast.toFixed(2)}x`;

    document.getElementById('slider-bitrate').value = conf.bitrate;
    document.getElementById('val-bitrate').textContent = `${conf.bitrate} Mbps`;

    document.getElementById('toggle-bloom').checked = conf.bloom;

    // Update pill buttons and resolution cards
    setResolution(conf.resolution, false);
    setFps(conf.fps, false);
  }

  updateGeneratedCommand();
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
  Array.from(container.children).forEach((btn) => {
    btn.classList.toggle('active', btn.textContent.includes(fps.toString()));
  });
  document.getElementById('preview-fps-tag').textContent = `${fps} FPS FLOW`;
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
  }, 6000);
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
