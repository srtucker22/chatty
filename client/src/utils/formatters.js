// eslint-disable-next-line
const sortObject = o => Object.keys(o).sort().reduce((r, k) => (r[k] = o[k], r), {});
export {
  sortObject,
};

