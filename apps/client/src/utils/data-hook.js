import { reaction } from "mobx";
import { useMemo, useSyncExternalStore } from "react";

function createSelectorStore(selector) {
	let snapshot = selector();
	return {
		getSnapshot: () => snapshot,
		subscribe: (notify) => reaction(selector, (value) => {
			snapshot = value;
			notify();
		}, { fireImmediately: true }),
	};
}

export function useData(property, deps = []) {
	// The supplied dependencies define the lifetime of the caller's selector.
	// eslint-disable-next-line react-hooks/use-memo -- This hook accepts explicit selector dependencies.
	const store = useMemo(() => createSelectorStore(property), deps);
	return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

export const useDataT = useData;

export function useTrigger(...triggers) {
	const store = useMemo(() => {
		let version = 0;
		return {
			getSnapshot: () => version,
			subscribe: (notify) => reaction(() => triggers.map((read) => read()), () => {
				version += 1;
				notify();
			}),
		};
	}, []);
	useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
