import { clsx } from 'clsx'

import { MagneticTile, type OverlayControlProps } from '@/features/magnetic-tile/magnetic-tile.tsx'
import styles from '@/features/magnetic-tiles/navigation/overlay.module.scss'

interface Props extends OverlayControlProps {
  url?: string | null
}

export default function Overlay(props: Props) {
  return (
    <MagneticTile.Overlay
      cache={props.cache}
      onAbort={props.onAbort}
      abortTimeoutMs={props.abortTimeoutMs}
      className={clsx([styles.overlay, styles.root])}>
      {props.url ? (
        <iframe
          src={props.url}
          referrerPolicy="unsafe-url"
          allow="accelerometer; autoplay; camera; clipboard-read; clipboard-write; encrypted-media; fullscreen; geolocation; gyroscope; magnetometer; microphone; midi; payment; picture-in-picture; publickey-credentials-get; screen-wake-lock; speaker-selection; usb; web-share; xr-spatial-tracking"
          allowFullScreen
          width="100%"
          height="100%"
          loading="eager"></iframe>
      ) : null}
    </MagneticTile.Overlay>
  )
}
