import gql from 'graphql-tag';

import FOLLOWED_FRAGMENT from './followed.fragment';

const FOLLOWED_ADDED_SUBSCRIPTION = gql`
  subscription onFollowedAdded($userId: Int!){
    followedAdded(userId: $userId){
      ... FollowedFragment
    }
  }
  ${FOLLOWED_FRAGMENT}
`;

export default FOLLOWED_ADDED_SUBSCRIPTION;
