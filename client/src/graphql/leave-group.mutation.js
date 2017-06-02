import gql from 'graphql-tag';

const LEAVE_GROUP_MUTATION = gql`
  mutation leaveGroup($id: Int!) {
    leaveGroup(id: $id) {
      id
    }
  }
`;

export default LEAVE_GROUP_MUTATION;
