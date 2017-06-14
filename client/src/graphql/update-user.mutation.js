import gql from 'graphql-tag';

const UPDATE_USER_MUTATION = gql`
  mutation updateUser($user: UpdateUserInput!) {
    updateUser(user: $user) {
      id
      registrationId
    }
  }
`;

export default UPDATE_USER_MUTATION;
