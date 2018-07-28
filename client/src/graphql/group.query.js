import gql from 'graphql-tag';

import GROUP_FRAGMENT from './group.fragment';

const GROUP_QUERY = gql`
  query group($groupId: Int!, $messageConnection: ConnectionInput = {first: 0}) {
    group(id: $groupId) {
      ... GroupFragment
    }
  }
  ${GROUP_FRAGMENT}
`;

export default GROUP_QUERY;
