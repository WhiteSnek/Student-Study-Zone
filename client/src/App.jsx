import { Outlet } from "react-router-dom";
import SocketProvider from "./context/SocketProvider";
import MediasoupProvider from "./context/MediasoupProvider";
function App() {
  return (
    <SocketProvider>
      <MediasoupProvider>
      <Outlet />
      </MediasoupProvider>
    </SocketProvider>
  );
}

export default App;
