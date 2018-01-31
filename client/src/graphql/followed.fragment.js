import gql from 'graphql-tag';

const FOLLOWED_FRAGMENT = gql`
  fragment FollowedFragment on User {
    id
    username
    followedsCount
    followeds {
      id
      username
    }
  }
`;

export default FOLLOWED_FRAGMENT;
