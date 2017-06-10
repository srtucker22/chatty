import gql from 'graphql-tag';

import GROUP_FRAGMENT from './group.fragment';

const GROUP_ADDED_SUBSCRIPTION = gql`
  subscription onGroupAdded($userId: Int, $first: Int = 1, $after: String, $last: Int, $before: String){
    groupAdded(userId: $userId){
      ... GroupFragment
    }
  }
  ${GROUP_FRAGMENT}
`;

export default GROUP_ADDED_SUBSCRIPTION;
