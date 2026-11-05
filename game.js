(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const playerScoreEl = document.getElementById('player-score');
  const cpuScoreEl = document.getElementById('cpu-score');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayCopy = document.getElementById('overlay-copy');
  const startButton = document.getElementById('start-button');
  const pauseButton = document.getElementById('pause-button');
  const resetButton = document.getElementById('reset-button');

  const W = canvas.width;
  const H = canvas.height;
  const PADDLE_W = 12;
  const PADDLE_H = 82;
  const BALL_R = 8;
  const WIN_SCORE = 5;
  const player = { x: 30, y: (H - PADDLE_H) / 2, score: 0 };
  const cpu = { x: W - 30 - PADDLE_W, y: (H - PADDLE_H) / 2, score: 0 };
  const ball = { x: W / 2, y: H / 2, vx: 0, vy: 0 };
  const keys = new Set();
  let running = false;
  let lastTime = 0;
  let serveTimer = null;

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#111722';
    ctx.fillRect(0, 0, W, H);

    ctx.setLineDash([7, 10]);
    ctx.strokeStyle = '#343b4b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#c7f36b';
    ctx.fillRect(player.x, player.y, PADDLE_W, PADDLE_H);
    ctx.fillStyle = '#a4adc0';
    ctx.fillRect(cpu.x, cpu.y, PADDLE_W, PADDLE_H);

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fillStyle = '#f2f4f8';
    ctx.shadowColor = '#f2f4f899';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function update(dt) {
    const moveSpeed = 390 * dt;
    if (keys.has('ArrowUp')) player.y -= moveSpeed;
    if (keys.has('ArrowDown')) player.y += moveSpeed;
    player.y = clamp(player.y, 0, H - PADDLE_H);

    // The CPU follows the ball with a small reaction offset to keep rallies fair.
    const targetY = ball.y - PADDLE_H / 2;
    const cpuSpeed = 285 * dt;
    const difference = targetY - cpu.y;
    cpu.y += clamp(difference, -cpuSpeed, cpuSpeed);
    cpu.y = clamp(cpu.y, 0, H - PADDLE_H);

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Top and bottom wall collision.
    if (ball.y - BALL_R <= 0) {
      ball.y = BALL_R;
      ball.vy = Math.abs(ball.vy);
    } else if (ball.y + BALL_R >= H) {
      ball.y = H - BALL_R;
      ball.vy = -Math.abs(ball.vy);
    }

    // Paddle collision; the impact point changes the ball's rebound angle.
    if (ball.vx < 0 && ball.x - BALL_R <= player.x + PADDLE_W &&
        ball.x + BALL_R >= player.x && ball.y >= player.y && ball.y <= player.y + PADDLE_H) {
      ball.x = player.x + PADDLE_W + BALL_R;
      bounceFromPaddle(player, 1);
    }
    if (ball.vx > 0 && ball.x + BALL_R >= cpu.x &&
        ball.x - BALL_R <= cpu.x + PADDLE_W && ball.y >= cpu.y && ball.y <= cpu.y + PADDLE_H) {
      ball.x = cpu.x - BALL_R;
      bounceFromPaddle(cpu, -1);
    }

    // A point is scored when the ball passes either paddle.
    if (ball.x + BALL_R < 0) scorePoint(cpu);
    if (ball.x - BALL_R > W) scorePoint(player);
  }

  function bounceFromPaddle(paddle, direction) {
    const relativeHit = (ball.y - (paddle.y + PADDLE_H / 2)) / (PADDLE_H / 2);
    const maxAngle = Math.PI * 0.38;
    const angle = relativeHit * maxAngle;
    const speed = Math.min(Math.hypot(ball.vx, ball.vy) * 1.055, 720);
    ball.vx = direction * speed * Math.cos(angle);
    ball.vy = speed * Math.sin(angle);
  }

  function scorePoint(winner) {
    winner.score += 1;
    playerScoreEl.textContent = player.score;
    cpuScoreEl.textContent = cpu.score;
    if (winner.score >= WIN_SCORE) {
      running = false;
      showOverlay(winner === player ? 'You win!' : 'CPU wins!', 'First to 5. Fancy a rematch?', 'PLAY AGAIN');
      return;
    }
    serve(1200);
  }

  function serve(delay = 700) {
    running = false;
    ball.x = W / 2;
    ball.y = H / 2;
    ball.vx = 0;
    ball.vy = 0;
    draw();
    clearTimeout(serveTimer);
    serveTimer = setTimeout(() => {
      if (player.score >= WIN_SCORE || cpu.score >= WIN_SCORE) return;
      const direction = Math.random() < 0.5 ? -1 : 1;
      const angle = (Math.random() - 0.5) * 0.7;
      const speed = 340;
      ball.vx = direction * speed * Math.cos(angle);
      ball.vy = speed * Math.sin(angle);
      running = true;
      hideOverlay();
    }, delay);
  }

  function showOverlay(title, copy, buttonText = 'START GAME') {
    overlayTitle.textContent = title;
    overlayCopy.textContent = copy;
    startButton.innerHTML = `${buttonText} <span>→</span>`;
    overlay.classList.remove('hidden');
  }

  function hideOverlay() { overlay.classList.add('hidden'); }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

  function frame(time) {
    const dt = Math.min((time - (lastTime || time)) / 1000, 0.04);
    lastTime = time;
    if (running) update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  function startMatch() {
    if (player.score >= WIN_SCORE || cpu.score >= WIN_SCORE) resetMatch();
    clearTimeout(serveTimer);
    if (!running && ball.vx === 0 && ball.vy === 0) serve(0);
    else if (!running) {
      running = true;
      hideOverlay();
    }
  }

  function resetMatch() {
    clearTimeout(serveTimer);
    running = false;
    player.score = 0;
    cpu.score = 0;
    player.y = cpu.y = (H - PADDLE_H) / 2;
    playerScoreEl.textContent = '0';
    cpuScoreEl.textContent = '0';
    ball.x = W / 2;
    ball.y = H / 2;
    ball.vx = ball.vy = 0;
    pauseButton.textContent = 'Ⅱ';
    pauseButton.setAttribute('aria-label', 'Pause game');
    showOverlay('Your serve', 'First to 5 points wins the match.', 'START GAME');
    draw();
  }

  startButton.addEventListener('click', startMatch);
  resetButton.addEventListener('click', resetMatch);
  pauseButton.addEventListener('click', () => {
    if (running) {
      running = false;
      showOverlay('Game paused', 'Take a breather. Your rally is waiting.', 'RESUME GAME');
      pauseButton.textContent = '▶';
      pauseButton.setAttribute('aria-label', 'Resume game');
    } else if (ball.vx !== 0 || ball.vy !== 0) {
      startMatch();
      pauseButton.textContent = 'Ⅱ';
      pauseButton.setAttribute('aria-label', 'Pause game');
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      keys.add(event.key);
    }
    if (event.key === ' ' && !event.repeat) {
      event.preventDefault();
      if (running) pauseButton.click();
      else startMatch();
    }
  });
  window.addEventListener('keyup', (event) => keys.delete(event.key));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleY = H / rect.height;
    player.y = clamp((event.clientY - rect.top) * scaleY - PADDLE_H / 2, 0, H - PADDLE_H);
  });

  draw();
  requestAnimationFrame(frame);
})();
