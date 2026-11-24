import './index.css';
import './i18n/config';
import '@fontsource/cherry-swash/400.css';
import '@fontsource/cherry-swash/700.css';
import '@fontsource/dancing-script/700.css';
import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { Home } from './pages/Home';
import { Reveal } from './pages/Reveal';

// Hash routing: works on any static host, and the sealed draw data in the
// URL fragment is never sent to the server.
const router = createHashRouter([
  { path: "/", element: <Home /> },
  { path: "/reveal", element: <Reveal /> },
]);

const root = createRoot(document.getElementById("root")!);
root.render(
  <RouterProvider router={router} />
);
