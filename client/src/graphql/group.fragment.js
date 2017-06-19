import gql from 'graphql-tag';

import MESSAGE_FRAGMENT from './message.fragment';

const GROUP_FRAGMENT = gql`
  fragment GroupFragment on Group {
    id
    name
    unreadCount
    lastRead {
      id
      createdAt
    }
    users {
      id
      username
    }
    messages(messageConnection: $messageConnection) {
      edges {
        cursor
        node {
          ... MessageFragment
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
      }
    }
  }
  ${MESSAGE_FRAGMENT}
`;

export default GROUP_FRAGMENT;
