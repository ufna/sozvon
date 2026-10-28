import React, { Children, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import Icon from "@/components/icon.jsx";

import styles from "./select.module.css";

export default function Select({ value, onChange, children, label }) {
	const options = Children.toArray(children).map(({ props }) => ({ value: String(props.value ?? ""), label: props.children }));
	const selected = options.findIndex((option) => option.value === String(value));
	const id = useId();
	const triggerRef = useRef(null), listRef = useRef(null);
	const searchRef = useRef({ text: "", time: 0 });
	const [ open, setOpen ] = useState(false);
	const [ active, setActive ] = useState(Math.max(0, selected));
	const [ position, setPosition ] = useState(null);

	useLayoutEffect(() => {
		if (!open) return;
		function update() {
			const rect = triggerRef.current.getBoundingClientRect();
			const rowHeight = window.matchMedia("(max-width: 640px)").matches ? 44 : 40;
			const desired = Math.min(280, options.length * rowHeight + 10);
			const below = window.innerHeight - rect.bottom - 14, above = rect.top - 14;
			const upward = below < desired && above > below;
			const height = Math.max(0, Math.min(desired, upward ? above : below));
			setPosition({
				width: Math.min(rect.width, window.innerWidth - 24), maxHeight: height,
				left: Math.max(12, Math.min(rect.left, window.innerWidth - rect.width - 12)),
				top: upward ? rect.top - 6 - height : rect.bottom + 6,
			});
		}
		update();
		window.addEventListener("resize", update);
		window.addEventListener("scroll", update, true);
		return () => {
			window.removeEventListener("resize", update);
			window.removeEventListener("scroll", update, true);
		};
	}, [ open, options.length ]);

	useEffect(() => {
		if (!open) return;
		function outside(event) {
			if (!triggerRef.current?.contains(event.target) && !listRef.current?.contains(event.target)) setOpen(false);
		}
		document.addEventListener("pointerdown", outside);
		return () => document.removeEventListener("pointerdown", outside);
	}, [ open ]);

	useEffect(() => {
		if (open) listRef.current?.querySelector("[data-active=\"true\"]")?.scrollIntoView({ block: "nearest" });
	}, [ active, open ]);

	function choose(index) {
		if (!options[index]) return;
		setOpen(false);
		onChange(options[index].value);
		triggerRef.current?.focus({ preventScroll: true });
	}

	function onKeyDown(event) {
		if (event.key === "Escape" && open) {
			event.preventDefault(); event.stopPropagation(); setOpen(false); return;
		}
		if (event.key === "Tab") {
			setOpen(false); return;
		}
		if ([ "Enter", " " ].includes(event.key)) {
			event.preventDefault(); event.stopPropagation();
			if (open) choose(active);
			else {
				setActive(Math.max(0, selected)); setOpen(true);
			}
			return;
		}
		if ([ "ArrowDown", "ArrowUp", "Home", "End" ].includes(event.key)) {
			event.preventDefault(); event.stopPropagation();
			const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : open ? (active + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length : Math.max(0, selected);
			setActive(next); setOpen(true); return;
		}
		if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
			event.preventDefault(); event.stopPropagation();
			const now = Date.now();
			const text = (now - searchRef.current.time < 700 ? searchRef.current.text : "") + event.key.toLocaleLowerCase();
			searchRef.current = { text, time: now };
			const index = options.findIndex((option) => String(option.label).toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, "").startsWith(text));
			if (index !== -1) {
				setActive(index); setOpen(true);
			}
		}
	}

	const target = triggerRef.current?.closest("[role=\"dialog\"]") || document.body;
	return <>
		<button type="button" ref={triggerRef} className={styles.trigger} role="combobox" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined} aria-activedescendant={open ? `${id}-${active}` : undefined} onKeyDown={onKeyDown} onClick={() => {
			setActive(Math.max(0, selected)); setOpen(!open);
		}}>
			<span className={styles.value}>{options[selected]?.label || ""}</span>
			<span className={styles.arrow}><Icon name="chevronDown" size={16} /></span>
		</button>
		{open && createPortal(<div id={id} ref={listRef} className={styles.list} role="listbox" aria-label={label} style={position || { visibility: "hidden" }}>
			{options.map((option, index) => <div key={option.value} id={`${id}-${index}`} className={styles.option} role="option" aria-selected={index === selected} data-active={index === active} onPointerMove={() => setActive(index)} onPointerDown={(event) => event.preventDefault()} onClick={() => choose(index)}>
				<span>{option.label}</span><span className={styles.check} data-selected={index === selected}><Icon name="check" size={16} /></span>
			</div>)}
		</div>, target)}
	</>;
}
