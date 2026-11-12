import type { CSSProperties } from "react";
import styles from "./voice-orb.module.css";

export function VoiceOrb({ level, active }: { level: number; active: boolean }) {
  return (
    <div aria-hidden="true" className={`${styles.stage} ${active ? styles.active : ""}`}
      style={{ "--voice-level": level } as CSSProperties}>
      <div className={styles.aura} />
      <div className={styles.orb}>
        <img src="/logo/studynest-logo.svg" alt="" className="h-16 w-16" />
      </div>
      <div className={styles.wave}>
        {[.25, .5, .75, 1, .75, .5, .25].map((weight, index) => (
          <span key={index} className={styles.bar} style={{ height: 3 + level * 19 * weight }} />
        ))}
      </div>
    </div>
  );
}
