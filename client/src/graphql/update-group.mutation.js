import gql from 'graphql-tag';

const UPDATE_GROUP_MUTATION = gql`
  mutation updateGroup($group: UpdateGroupInput!) {
    updateGroup(group: $group) {
      id
      name
      icon
      lastRead {
        id
        createdAt
      }
    }
  }
`;

export default UPDATE_GROUP_MUTATION;
