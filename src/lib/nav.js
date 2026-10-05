export const navigate = (hash) => {
  if (window.location.hash !== hash) window.location.hash = hash;
};
