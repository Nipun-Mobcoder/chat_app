const typeDefs = `

    scalar Upload

    type Message {
        id: ID!
        sender: String
        message: String
        file: File
    }

    type User {
        userName: String!
        email: String!
    }

    type File {
        filename: String
        mimetype: String
        url: String
    }

    type Query {
        messages: [Message]
        login(email: String!, password: String!): String
    }

    type Mutation {
        register(userName: String!, email: String!, password: String!): User
        sendMessage(to: String!, message: String, file: Upload): String
    }

    type Subscription {
        showMessages(tokenId: String!): Message
    }

`;

export default typeDefs;
