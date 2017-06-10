import gql from 'graphql-tag';

import GROUP_FRAGMENT from './group.fragment';

const GROUP_QUERY = gql`
  query group($groupId: Int!, $first: Int = 1, $after: String, $last: Int, $before: String) {
    group(id: $groupId) {
      ... GroupFragment
    }
  }
  ${GROUP_FRAGMENT}
`;

export default GROUP_QUERY;
