
let _virtuosoRef: import("react-virtuoso").VirtuosoHandle | null = null;

export const setVirtuosoRef = (ref: import("react-virtuoso").VirtuosoHandle | null) => {
  _virtuosoRef = ref;
};

export const getVirtuosoRef = () => _virtuosoRef;
