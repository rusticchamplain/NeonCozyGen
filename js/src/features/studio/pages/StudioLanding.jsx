export default function StudioLanding() {

  return (
    <div className="page-shell page-stack">
      <section className="home-hero">
        <span className="home-hero-orb is-warm" aria-hidden="true" />
        <span className="home-hero-orb is-cool" aria-hidden="true" />
        <span className="home-hero-spark" aria-hidden="true" />
        <span className="home-hero-beam" aria-hidden="true" />
        <span className="home-hero-ring" aria-hidden="true" />
        <div className="home-hero-inner home-hero-full">
          <div className="home-hero-kicker">CozyGen Studio</div>
          <h1 className="home-hero-title">Creative studio for prompt-first storytelling</h1>
          <p className="home-hero-description">
            CozyGen is a quiet, cinematic workspace for people who sketch with words—shape the mood, stage the scene,
            then send it down the render runway without losing your flow.
          </p>
          <div className="home-info-grid">
            <article className="ui-card">
              <h3 className="text-xs uppercase tracking-[0.12em] text-[rgba(159,178,215,0.8)]">
                Control as composition
              </h3>
              <p className="mt-1 text-[0.78rem] leading-relaxed text-[rgba(204,217,255,0.75)]">
                Dial the palette, tempo, and texture in one place. The controls read like a creative brief, not a checklist.
              </p>
            </article>
            <article className="ui-card">
              <h3 className="text-xs uppercase tracking-[0.12em] text-[rgba(159,178,215,0.8)]">
                Alias & tag storyboards
              </h3>
              <p className="mt-1 text-[0.78rem] leading-relaxed text-[rgba(204,217,255,0.75)]">
                Save characters, atmospheres, and motifs as building blocks, then arrange them like panels in a storyboard.
              </p>
            </article>
            <article className="ui-card">
              <h3 className="text-xs uppercase tracking-[0.12em] text-[rgba(159,178,215,0.8)]">
                Gallery inspiration
              </h3>
              <p className="mt-1 text-[0.78rem] leading-relaxed text-[rgba(204,217,255,0.75)]">
                Pin your strongest frames, compare variations, and carry the aesthetic through to your next scene.
              </p>
            </article>
            <article className="ui-card">
              <h3 className="text-xs uppercase tracking-[0.12em] text-[rgba(159,178,215,0.8)]">
                Render runway
              </h3>
              <p className="mt-1 text-[0.78rem] leading-relaxed text-[rgba(204,217,255,0.75)]">
                Stack iterations like takes on a set. Keep composing while the queue runs in the background.
              </p>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
