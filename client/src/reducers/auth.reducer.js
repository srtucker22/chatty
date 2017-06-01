import Immutable from 'seamless-immutable';

const initialState = Immutable({
  loading: true,
});

const auth = (state = initialState, action) => {
  switch (action.type) {
    default:
      return state;
  }
};

export default auth;
