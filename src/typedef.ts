const typeDefs = `
        type Query {
            messages: [String]
        }

        type Mutation {
            sendMessage(to: String!, message: String!): String
        }

        type Subscription {
            messageAdded: String
        }
    `
;

export default typeDefs;