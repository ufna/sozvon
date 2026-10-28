import React, { useEffect, useState } from "react";

import sozvonWordmark from "@/assets/sozvon-wordmark.svg?raw";
import { BRAND_NAMES, getIdentity, getLogo, logoPath } from "@/utils/brand.js";

// Bundled vector lettering keeps the logo stable while interface fonts load.
const WORDMARKS = { sozvon: sozvonWordmark };

export default function Brand({ compact = false }) {
	const [ choice, setChoice ] = useState(() => ({ logo: getLogo(), identity: getIdentity() }));
	useEffect(() => {
		function update() {
			setChoice({ logo: getLogo(), identity: getIdentity() });
		}
		window.addEventListener("sozvon:brand", update);
		return () => window.removeEventListener("sozvon:brand", update);
	}, []);
	useEffect(() => {
		const favicon = document.querySelector("link[rel=\"icon\"][type=\"image/svg+xml\"]");
		if (favicon) favicon.href = choice.logo === "zov" ? "/favicon.svg?v=graphite-3" : logoPath(choice.logo);
	}, [ choice.logo ]);
	const homeParams = new URLSearchParams(location.search);
	homeParams.delete("view");
	return <a className="brand" href={location.pathname === "/design" ? `/design?${homeParams}` : "/"} aria-label={BRAND_NAMES[choice.identity]}>
		<span className="brand-symbol" style={{ "--brand-mask": `url(${logoPath(choice.logo)})` }} />
		{!compact && <span className="brand-name" aria-hidden="true" dangerouslySetInnerHTML={{ __html: WORDMARKS[choice.identity] }} />}
	</a>;
}
