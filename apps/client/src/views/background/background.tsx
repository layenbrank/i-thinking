import { getCurrentWindow } from '@tauri-apps/api/window'
import BackgroundURL from '@/assets/videos/demo.mp4'

export default function Background() {
  useEffect(function () {
    function bootstrap() {
      void getCurrentWindow().setAlwaysOnBottom(true)
      // getCurrentWindow().set
    }
    bootstrap()
  }, [])
  return (
    <div className="background-view size-full">
      <video
        src={BackgroundURL}
        autoPlay
        loop
        muted
        className="size-full"></video>
    </div>
  )
}
