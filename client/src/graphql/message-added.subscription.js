import gql from 'graphql-tag';

import MESSAGE_FRAGMENT from './message.fragment';

const MESSAGE_ADDED_SUBSCRIPTION = gql`
  subscription onMessageAdded($groupIds: [Int]){
    messageAdded(groupIds: $groupIds){
      ... MessageFragment
    }
  }
  ${MESSAGE_FRAGMENT}
`;

export default MESSAGE_ADDED_SUBSCRIPTION;
