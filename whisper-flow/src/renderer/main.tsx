import "@radix-ui/themes/styles.css";
import "./index.css";
import { Theme } from "@radix-ui/themes";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

const root = createRoot(document.getElementById("root")!);
root.render(
	<StrictMode>
		<Theme appearance="dark" accentColor="iris" radius="medium">
			<App />
		</Theme>
	</StrictMode>,
);
