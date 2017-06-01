import gql from 'graphql-tag';

const SIGNUP_MUTATION = gql`
  mutation signup($email: String!, $password: String!) {
    signup(email: $email, password: $password) {
      id
      jwt
      username
    }
  }
`;

export default SIGNUP_MUTATION;
