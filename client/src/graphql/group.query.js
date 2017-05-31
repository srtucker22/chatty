import gql from 'graphql-tag';

import MESSAGE_FRAGMENT from './message.fragment';

const GROUP_QUERY = gql`
  query group($groupId: Int!) {
    group(id: $groupId) {
      id
      name
      users {
        id
        username
      }
      messages {
        ... MessageFragment
      }
    }
  }
  ${MESSAGE_FRAGMENT}
`;

export default GROUP_QUERY;
