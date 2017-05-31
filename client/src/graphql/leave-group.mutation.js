import gql from 'graphql-tag';

const LEAVE_GROUP_MUTATION = gql`
  mutation leaveGroup($id: Int!, $userId: Int!) {
    leaveGroup(id: $id, userId: $userId) {
      id
    }
  }
`;

export default LEAVE_GROUP_MUTATION;
