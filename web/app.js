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
    sharpness: 0.75, contrast: 1.16, saturation: 1.25, brightness: 0.01,
    denoise: 1.5, bloom: true, fps: 120, resolution: '4k', bitrate: 75, codec: 'h264',
  },
  instagram_reels_hdr: {
    title: 'Instagram Reels 4K HDR',
    specs: '4K UHD • 60 FPS • 65 Mbps • H.264',
    sharpness: 0.80, contrast: 1.20, saturation: 1.32, brightness: 0.01,
    denoise: 1.4, bloom: true, fps: 60, resolution: '4k', bitrate: 65, codec: 'h264',
  },
  low_light_indoor_fix: {
    title: 'Indoor / Low-Light Fix',
    specs: '4K UHD • 60 FPS • Heavy Denoise • Lifted Shadows',
    sharpness: 0.60, contrast: 1.08, saturation: 1.15, brightness: 0.02,
    denoise: 2.6, bloom: true, fps: 60, resolution: '4k', bitrate: 65, codec: 'h264',
  },
  velocity_flow_480fps: {
    title: 'Velocity Flow 480 FPS',
    specs: '4K UHD • 480 FPS • 80 Mbps • Shutter Blur',
    sharpness: 0.70, contrast: 1.14, saturation: 1.20, brightness: 0.00,
    denoise: 1.8, bloom: true, fps: 480, resolution: '4k', bitrate: 80, codec: 'h264',
  },
  youtube_shorts_8k: {
    title: 'YouTube Shorts 8K',
    specs: '8K Master • 60 FPS • 95 Mbps • H.264',
    sharpness: 0.55, contrast: 1.10, saturation: 1.12, brightness: 0.00,
    denoise: 1.2, bloom: false, fps: 60, resolution: '8k', bitrate: 95, codec: 'h264',
  },
  alight_motion_dark: {
    title: 'Alight Motion Dark',
    specs: '4K UHD • 60 FPS • 60 Mbps • Crushed Blacks',
    sharpness: 0.85, contrast: 1.25, saturation: 1.35, brightness: -0.02,
    denoise: 1.2, bloom: true, fps: 60, resolution: '4k', bitrate: 60, codec: 'h264',
  },
  cyberpunk_neon: {
    title: 'Cyberpunk Neon',
    specs: '4K UHD • 60 FPS • 65 Mbps • Cyan/Amber',
    sharpness: 0.90, contrast: 1.22, saturation: 1.30, brightness: 0.01,
    denoise: 1.5, bloom: true, fps: 60, resolution: '4k', bitrate: 65, codec: 'h264',
  },
  extreme_phone_killer_12k: {
    title: '12K Benchmark Master',
    specs: '12K (74.6 MP) • 120 Mbps • H.265 Master',
    sharpness: 0.92, contrast: 1.25, saturation: 1.35, brightness: 0.01,
    denoise: 1.2, bloom: true, fps: 60, resolution: '12k', bitrate: 120, codec: 'h265',
  },
};

// ─── Initialize ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initComparisonSlider();
  initDropzone();
  selectPreset('tiktok_4k_120fps');
  updateGeneratedCommand();
});

// ─── Tab Switching ────────────────────────────────────────────────────────────
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

// ─── Preset Selection ─────────────────────────────────────────────────────────
function selectPreset(presetId) {
  state.preset = presetId;

  // Highlight active card
  document.querySelectorAll('.preset-card').forEach((card) => {
    card.classList.toggle('active', card.id === `preset-${presetId}`);
  });

  const conf = presetConfig[presetId];
  if (!conf) return;

  // Apply preset values to state
  state.sharpness = conf.sharpness;
  state.contrast  = conf.contrast;
  state.saturation = conf.saturation;
  state.brightness = conf.brightness;
  state.denoise   = conf.denoise;
  state.bloom     = conf.bloom;
  state.fps       = conf.fps;
  state.resolution = conf.resolution;
  state.bitrate   = conf.bitrate;
  state.codec     = conf.codec;

  // Update Quick Continue bar
  const nameEl  = document.getElementById('continue-preset-name');
  const badgeEl = document.getElementById('continue-specs-badge');
  if (nameEl)  nameEl.textContent  = conf.title;
  if (badgeEl) badgeEl.textContent = conf.specs;

  // Sync sliders
  _syncSlider('slider-sharpness',  'val-sharpness',  conf.sharpness.toFixed(2));
  _syncSlider('slider-contrast',   'val-contrast',   `${conf.contrast.toFixed(2)}x`);
  _syncSlider('slider-saturation', 'val-saturation', `${conf.saturation.toFixed(2)}x`);
  _syncSlider('slider-brightness', 'val-brightness',
    (conf.brightness >= 0 ? '+' : '') + conf.brightness.toFixed(2));
  _syncSlider('slider-bitrate',    'val-bitrate',    `${conf.bitrate} Mbps`);

  const tBloom = document.getElementById('toggle-bloom');
  if (tBloom) tBloom.checked = conf.bloom;

  // Sync pill selectors
  setResolution(conf.resolution, false);
  setFps(conf.fps, false);
  setCodec(conf.codec, false);
  setDenoise(conf.denoise, false);

  updateGeneratedCommand();
}

function _syncSlider(sliderId, valId, displayText) {
  const slider = document.getElementById(sliderId);
  const valEl  = document.getElementById(valId);
  if (slider) slider.value = parseFloat(displayText);
  if (valEl)  valEl.textContent = displayText;
}

// ─── Pro Controls Accordion ───────────────────────────────────────────────────
function toggleProControls() {
  const container = document.getElementById('pro-controls-container');
  const icon      = document.getElementById('pro-controls-icon');
  if (!container) return;
  const isHidden = container.style.display === 'none' || container.style.display === '';
  container.style.display = isHidden ? 'flex' : 'none';
  if (icon) icon.textContent = isHidden ? '▲' : '▼';
}

// ─── Parameter Controls ───────────────────────────────────────────────────────
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

function setResolution(res, updateCmd = true) {
  state.resolution = res;
  document.querySelectorAll('.res-card').forEach((card) => {
    const tagEl = card.querySelector('.res-tag');
    if (!tagEl) return;
    // Match by res value stored in onclick attribute
    const onclick = card.getAttribute('onclick') || '';
    card.classList.toggle('active', onclick.includes(`'${res}'`));
  });
  const upscaleEl = document.getElementById('spec-upscale');
  if (upscaleEl) upscaleEl.textContent = res.toUpperCase();
  if (updateCmd) updateGeneratedCommand();
}

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
    const el = document.getElementById('val-sharpness');
    if (el) el.textContent = num.toFixed(2);
  } else if (param === 'contrast') {
    state.contrast = num;
    const el = document.getElementById('val-contrast');
    if (el) el.textContent = `${num.toFixed(2)}x`;
  } else if (param === 'saturation') {
    state.saturation = num;
    const el = document.getElementById('val-saturation');
    if (el) el.textContent = `${num.toFixed(2)}x`;
  } else if (param === 'brightness') {
    state.brightness = num;
    const el = document.getElementById('val-brightness');
    if (el) el.textContent = (num >= 0 ? '+' : '') + num.toFixed(2);
  } else if (param === 'bitrate') {
    state.bitrate = parseInt(val, 10);
    const el = document.getElementById('val-bitrate');
    if (el) el.textContent = `${state.bitrate} Mbps`;
  }
  updateGeneratedCommand();
}

function updateBloomToggle(isChecked) {
  state.bloom = isChecked;
  updateGeneratedCommand();
}

// ─── CLI Command Builder ──────────────────────────────────────────────────────
function getCliCommand() {
  const inputTarget = state.sourceType === 'url'
    ? state.videoUrl
    : (state.fileName || 'inputs/my_mobile_video.mp4');

  let cmd = `python core/pipeline.py -i "${inputTarget}" -p ${state.preset} -r ${state.resolution} -fps ${state.fps} -m ${state.motionMode} --bitrate ${state.bitrate} --codec ${state.codec}`;

  if (!state.bloom) cmd += ' --no-bloom';

  const pc = presetConfig[state.preset];
  if (pc) {
    if (state.sharpness !== pc.sharpness)   cmd += ` --sharpness ${state.sharpness.toFixed(2)}`;
    if (state.contrast  !== pc.contrast)    cmd += ` --contrast ${state.contrast.toFixed(2)}`;
    if (state.saturation !== pc.saturation) cmd += ` --saturation ${state.saturation.toFixed(2)}`;
    if (state.brightness !== pc.brightness) cmd += ` --brightness ${state.brightness.toFixed(2)}`;
    if (state.denoise   !== pc.denoise)     cmd += ` --denoise ${state.denoise.toFixed(1)}`;
  }
  return cmd;
}

function updateGeneratedCommand() {
  const targets = ['generated-command', 'generated-cli-code'];
  const cmd = getCliCommand();
  targets.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = cmd;
  });
}

function copyCliCommand() {
  navigator.clipboard.writeText(getCliCommand()).then(() => {
    showToast('FFmpeg Pipeline command copied to clipboard!');
  });
}

// ─── Drag & Drop & Metadata Inspector ────────────────────────────────────────
function initDropzone() {
  const dropzone  = document.getElementById('video-dropzone');
  const fileInput = document.getElementById('file-input');
  if (!dropzone || !fileInput) return;

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleFile(e.target.files[0]);
  });
}

function handleFile(file) {
  state.fileObject = file;
  state.fileName   = `inputs/${file.name}`;

  document.getElementById('spec-name').textContent = file.name;
  const sizeMb  = (file.size / (1024 * 1024)).toFixed(1);
  const sizeText = file.size > 1024 * 1024 * 1024
    ? `${(file.size / (1024 * 1024 * 1024)).toFixed(2)} GB`
    : `${sizeMb} MB`;
  document.getElementById('spec-size').textContent = sizeText;

  const video = document.createElement('video');
  video.preload = 'metadata';
  video.onloadedmetadata = function () {
    window.URL.revokeObjectURL(video.src);
    const w = video.videoWidth, h = video.videoHeight;
    const durSec = Math.round(video.duration);
    const durStr = `${Math.floor(durSec / 60).toString().padStart(2,'0')}:${(durSec % 60).toString().padStart(2,'0')}`;
    document.getElementById('spec-res').textContent = `${w} x ${h}`;
    document.getElementById('spec-dur').textContent = durStr;
    document.getElementById('inspector-card').style.display = 'flex';
  };
  video.src = URL.createObjectURL(file);

  // Auto-stream to local server
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    const progContainer = document.getElementById('upload-progress-container');
    const progBar       = document.getElementById('upload-progress-bar');
    const statusText    = document.getElementById('upload-status-text');
    const percentText   = document.getElementById('upload-percent-text');
    if (progContainer) progContainer.style.display = 'block';
    if (statusText)    statusText.textContent = `Streaming ${file.name} to disk...`;

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/upload?filename=${encodeURIComponent(file.name)}`, true);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        if (progBar)    progBar.style.width     = `${pct}%`;
        if (percentText) percentText.textContent = `${pct}%`;
      }
    };
    xhr.onload = () => {
      if (statusText) statusText.textContent = `✅ Saved to inputs/${file.name}`;
      if (progContainer) setTimeout(() => { progContainer.style.display = 'none'; }, 2000);
      showToast(`Saved to inputs/${file.name}`);
    };
    xhr.send(file);
  }

  showToast(`Loaded ${file.name} (${sizeText})`);
  updateGeneratedCommand();
}

// ─── Interactive Before / After Split Slider ──────────────────────────────────
function initComparisonSlider() {
  const stage       = document.getElementById('comparison-stage');
  const stageBefore = document.getElementById('stage-before');
  const splitDivider = document.getElementById('split-divider');
  if (!stage || !stageBefore || !splitDivider) return;

  let isDragging = false;

  const moveSlider = (clientX) => {
    const rect = stage.getBoundingClientRect();
    let x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const pct = (x / rect.width) * 100;
    stageBefore.style.width   = `${pct}%`;
    splitDivider.style.left   = `${pct}%`;
  };

  stage.addEventListener('mousedown', (e) => { isDragging = true; moveSlider(e.clientX); });
  window.addEventListener('mousemove', (e) => { if (isDragging) moveSlider(e.clientX); });
  window.addEventListener('mouseup',   () =>  { isDragging = false; });

  stage.addEventListener('touchstart', (e) => {
    isDragging = true;
    if (e.touches.length) moveSlider(e.touches[0].clientX);
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (isDragging && e.touches.length) moveSlider(e.touches[0].clientX);
  }, { passive: true });
  window.addEventListener('touchend', () => { isDragging = false; });
}

// ─── GitHub Actions Modal & Cloud Dispatch ────────────────────────────────────
function openGitHubModal() {
  const modal    = document.getElementById('github-modal');
  const preview  = document.getElementById('dispatch-payload-preview');
  const patInput = document.getElementById('gh-pat-input');

  const savedPat = localStorage.getItem('hyper_res_gh_pat');
  if (savedPat && patInput) patInput.value = savedPat;

  const payload = {
    ref: 'main',
    inputs: {
      video_url:   state.sourceType === 'url' ? state.videoUrl : '',
      preset:      state.preset,
      resolution:  state.resolution,
      fps:         state.fps.toString(),
      motion_mode: state.motionMode,
      sharpness:   state.sharpness.toString(),
      bitrate:     state.bitrate.toString(),
      bloom:       state.bloom,
      codec:       state.codec,
    },
  };

  if (preview) preview.textContent = JSON.stringify(payload, null, 2);
  if (modal)   modal.classList.add('active');

  const alertBox = document.getElementById('modal-alert-box');
  if (alertBox) alertBox.style.display = 'none';
}

function closeGitHubModal() {
  const modal = document.getElementById('github-modal');
  if (modal) modal.classList.remove('active');
}

function openGitHubActionsDirectly() {
  const repoEl = document.getElementById('gh-repo-input');
  const repo   = (repoEl ? repoEl.value.trim() : '') || state.githubRepo;
  window.open(`https://github.com/${repo}/actions/workflows/enhance_video.yml`, '_blank');
  showToast('Opening GitHub Actions in new tab! Click "Run workflow"');
  closeGitHubModal();
}

async function submitGitHubDispatch() {
  const repoEl  = document.getElementById('gh-repo-input');
  const patEl   = document.getElementById('gh-pat-input');
  const alertBox  = document.getElementById('modal-alert-box');
  const alertText = document.getElementById('modal-alert-text');

  const repo = repoEl ? repoEl.value.trim() : '';
  const pat  = patEl  ? patEl.value.trim()  : '';

  const showAlert = (msg) => {
    if (alertBox && alertText) {
      alertText.textContent = msg;
      alertBox.style.display = 'block';
    } else {
      alert(msg);
    }
  };

  if (!repo) { showAlert('Please enter your GitHub Repository name'); return; }
  if (!pat)  {
    showAlert('Please paste your Personal Access Token (PAT) starting with ghp_, or click "Run Directly on GitHub" above!');
    return;
  }

  localStorage.setItem('hyper_res_gh_pat', pat);
  if (alertBox) alertBox.style.display = 'none';

  const btn = document.getElementById('btn-submit-dispatch');
  if (btn) { btn.textContent = 'Dispatching to Cloud...'; btn.disabled = true; }

  try {
    const url = `https://api.github.com/repos/${repo}/actions/workflows/enhance_video.yml/dispatches`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept':        'application/vnd.github.v3+json',
        'Authorization': `Bearer ${pat}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          video_url:   state.sourceType === 'url' ? state.videoUrl : '',
          preset:      state.preset,
          resolution:  state.resolution,
          fps:         state.fps.toString(),
          motion_mode: state.motionMode,
          sharpness:   state.sharpness.toString(),
          bitrate:     state.bitrate.toString(),
          bloom:       state.bloom,
          codec:       state.codec,
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
        showAlert('❌ Bad credentials: Token is invalid or expired. Generate a new GitHub Token with "workflow" permission, or use "Run Directly on GitHub" above!');
      } else {
        showAlert(`Dispatch failed (${response.status}): ${err.message || 'Check permissions.'}`);
      }
    }
  } catch (e) {
    showAlert(`Error dispatching workflow: ${e.message}`);
  } finally {
    if (btn) { btn.textContent = 'Launch Cloud Master 🚀'; btn.disabled = false; }
  }
}

// ─── Live Run Status Monitor ──────────────────────────────────────────────────
let monitorInterval = null;
let monitorStartTime = null;

function startLiveMonitor(repo, pat) {
  const monitorCard = document.getElementById('live-monitor-card');
  const statusText  = document.getElementById('monitor-status-text');
  const timerText   = document.getElementById('monitor-timer');
  const msgText     = document.getElementById('monitor-msg');
  const actionsEl   = document.getElementById('monitor-actions');
  const dlBtn       = document.getElementById('btn-direct-download');
  if (!monitorCard) return;

  monitorCard.style.display = 'flex';
  if (actionsEl)  actionsEl.style.display = 'none';
  if (statusText) statusText.textContent  = 'Workflow Dispatched • Queued...';
  if (msgText)    msgText.textContent     = `Targeting ${state.resolution.toUpperCase()} @ ${state.fps} FPS render on GitHub Actions.`;

  monitorStartTime = Date.now();
  if (monitorInterval) clearInterval(monitorInterval);

  monitorInterval = setInterval(async () => {
    const elapsed = Math.floor((Date.now() - monitorStartTime) / 1000);
    const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const secs = (elapsed % 60).toString().padStart(2, '0');
    if (timerText) timerText.textContent = `${mins}:${secs}`;

    try {
      const res = await fetch(`https://api.github.com/repos/${repo}/actions/runs?per_page=1`, {
        headers: { 'Authorization': `Bearer ${pat}` },
      });
      if (res.ok) {
        const data = await res.json();
        const run  = data.workflow_runs?.[0];
        if (run) {
          if (run.status === 'in_progress') {
            if (statusText) statusText.textContent = 'Processing Master Video on Cloud...';
          } else if (run.status === 'completed') {
            clearInterval(monitorInterval);
            if (run.conclusion === 'success') {
              if (statusText) statusText.textContent = '✅ Master Enhancement Completed!';
              if (msgText)    msgText.textContent    = 'Your ultra-high resolution master video is ready in GitHub Releases!';
              if (dlBtn)      dlBtn.href             = `https://github.com/${repo}/releases`;
              if (actionsEl)  actionsEl.style.display = 'block';
            } else {
              if (statusText) statusText.textContent = '❌ Workflow Error';
              if (msgText)    msgText.textContent    = `Job finished with status: ${run.conclusion}. Check the Actions tab for logs.`;
            }
          }
        }
      }
    } catch (_e) {
      // silent poll failure — will retry next tick
    }
  }, 2500);
}

// ─── Local Execution Engine ───────────────────────────────────────────────────
async function runLocally() {
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    copyCliCommand();
    alert('You are running on a remote host (Vercel). To render locally, run `python dashboard_server.py` on your PC, or click "Dispatch on GitHub Actions" for free cloud render!');
    return;
  }

  const inputTarget = state.fileName || 'inputs/test_mobile_raw.mp4';
  const monitorCard = document.getElementById('live-monitor-card');
  const statusText  = document.getElementById('monitor-status-text');
  const timerText   = document.getElementById('monitor-timer');
  const msgText     = document.getElementById('monitor-msg');
  const actionsEl   = document.getElementById('monitor-actions');
  const dlBtn       = document.getElementById('btn-direct-download');
  const btnLocal    = document.getElementById('btn-run-local');

  if (monitorCard) monitorCard.style.display = 'flex';
  if (actionsEl)   actionsEl.style.display   = 'none';
  if (statusText)  statusText.textContent     = '🚀 Local Master Render Started...';
  if (msgText)     msgText.textContent        = `Processing ${inputTarget} to ${state.resolution.toUpperCase()} @ ${state.fps} FPS.`;
  if (btnLocal)    btnLocal.disabled          = true;

  try {
    const res = await fetch('/api/enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input_path:  inputTarget,
        preset:      state.preset,
        resolution:  state.resolution,
        fps:         state.fps,
        motion_mode: state.motionMode,
        codec:       state.codec,
        bloom:       state.bloom,
        sharpness:   state.sharpness,
        contrast:    state.contrast,
        bitrate:     state.bitrate,
      }),
    });

    const data = await res.json();
    if (!data.success) {
      if (statusText) statusText.textContent = '❌ Failed to start local job';
      if (btnLocal)   btnLocal.disabled = false;
      return;
    }

    const jobId  = data.job_id;
    const startT = Date.now();
    showToast('Local render running! Watch live monitor.');

    const localInterval = setInterval(async () => {
      const elapsed = Math.floor((Date.now() - startT) / 1000);
      const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const secs = (elapsed % 60).toString().padStart(2, '0');
      if (timerText) timerText.textContent = `${mins}:${secs}`;

      try {
        const sRes  = await fetch(`/api/status?id=${jobId}`);
        const sData = await sRes.json();

        if (sData.status === 'COMPLETED') {
          clearInterval(localInterval);
          if (statusText) statusText.textContent = '✅ Local Master Render Complete!';
          if (msgText)    msgText.textContent    = `Output saved to: outputs/${sData.output_file}`;
          if (dlBtn) {
            dlBtn.href        = '/api/outputs';
            dlBtn.target      = '_blank';
            dlBtn.textContent = 'View in Outputs Folder';
          }
          if (actionsEl)  actionsEl.style.display = 'block';
          if (btnLocal)   btnLocal.disabled        = false;
          showToast('Master render completed!');
        } else if (sData.status === 'FAILED') {
          clearInterval(localInterval);
          if (statusText) statusText.textContent = '❌ Render Error';
          if (msgText)    msgText.textContent    = sData.error || 'Check terminal console for details.';
          if (btnLocal)   btnLocal.disabled      = false;
        }
      } catch (_e) {
        // poll failure
      }
    }, 2500);

  } catch (e) {
    if (statusText) statusText.textContent = '❌ Connection Error';
    if (msgText)    msgText.textContent    = e.message;
    if (btnLocal)   btnLocal.disabled      = false;
  }
}

// ─── Toast Helper ─────────────────────────────────────────────────────────────
function showToast(message) {
  const toast    = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-msg');
  if (!toast || !toastMsg) return;
  toastMsg.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3200);
}
