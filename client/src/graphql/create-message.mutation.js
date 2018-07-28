import gql from 'graphql-tag';

import MESSAGE_FRAGMENT from './message.fragment';

const CREATE_MESSAGE_MUTATION = gql`
  mutation createMessage($message: CreateMessageInput!) {
    createMessage(message: $message) {
      ... MessageFragment
    }
  }
  ${MESSAGE_FRAGMENT}
`;

export default CREATE_MESSAGE_MUTATION;
