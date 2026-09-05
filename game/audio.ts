/** Tiny original synthesized cues; audio begins only after a user gesture. */
export class BattleAudio {
  private ctx: AudioContext | null = null;
  enabled = true;
  async unlock() {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }
  cue(kind: 'order' | 'magic' | 'recruit' | 'start' | 'win') {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    const ctx = this.ctx,
      now = ctx.currentTime;
    const notes =
      kind === 'magic'
        ? [196, 294, 392, 588]
        : kind === 'start' || kind === 'win'
          ? [146.83, 220, 293.66, 440]
          : kind === 'recruit'
            ? [330, 440]
            : [220];
    notes.forEach((freq, i) => {
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.type = kind === 'magic' ? 'triangle' : 'sine';
      o.frequency.setValueAtTime(freq, now + i * 0.07);
      g.gain.setValueAtTime(0, now + i * 0.07);
      g.gain.linearRampToValueAtTime(0.045, now + i * 0.07 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.6);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(now + i * 0.07);
      o.stop(now + i * 0.07 + 0.65);
    });
  }
  dispose() {
    void this.ctx?.close();
    this.ctx = null;
  }
}
