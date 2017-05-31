import gql from 'graphql-tag';

const DELETE_GROUP_MUTATION = gql`
  mutation deleteGroup($id: Int!) {
    deleteGroup(id: $id) {
      id
    }
  }
`;

export default DELETE_GROUP_MUTATION;
