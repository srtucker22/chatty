import { PubSub } from 'graphql-subscriptions';
import { parse } from 'graphql';
import { getArgumentValues } from 'graphql/execution/values';

export function getSubscriptionDetails({ baseParams, schema }) {
  const parsedQuery = parse(baseParams.query);
  let args = {};
  // operationName is the name of the only root field in the
  // subscription document
  let subscriptionName = '';
  parsedQuery.definitions.forEach((definition) => {
    if (definition.kind === 'OperationDefinition') {
      // only one root field is allowed on subscription.
      // No fragments for now.
      const rootField = (definition).selectionSet.selections[0];
      subscriptionName = rootField.name.value;
      const fields = schema.getSubscriptionType().getFields();
      args = getArgumentValues(
        fields[subscriptionName],
        rootField,
        baseParams.variables,
      );
    }
  });

  return { args, subscriptionName };
}

export const pubsub = new PubSub();

export default pubsub;
