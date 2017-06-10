import gql from 'graphql-tag';

import GROUP_FRAGMENT from './group.fragment';

const CREATE_GROUP_MUTATION = gql`
  mutation createGroup($name: String!, $userIds: [Int!], $first: Int = 1, $after: String, $last: Int, $before: String) {
    createGroup(name: $name, userIds: $userIds) {
      ... GroupFragment
    }
  }
  ${GROUP_FRAGMENT}
`;

export default CREATE_GROUP_MUTATION;
