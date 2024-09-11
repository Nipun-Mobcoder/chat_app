const typeDefs = `

    scalar Upload

    type Message {
        id: ID!
        sender: String
        message: String
        file: File
        createdAt: String
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

    input PartType {
        etag: String!
        PartNumber: Int!
    }

    type Result {
        status: Int
    }

    type loginResponse {
        token: String
        name: String
    }

    type Query {
        messages: [Message]
        showUserMessage(sender: String!): [Message]
        login(email: String!, password: String!): loginResponse
        startMultipart(fileName: String!, contentType: String!): String
        generateMultipart(fileName: String!, uploadId: String!, partNumbers: Int!): [String]
    }

    type Mutation {
        register(userName: String!, email: String!, password: String!): User
        sendMessage(to: String!, message: String, file: Upload): String
        complete(fileName: String!, uploadId: String!, parts: [PartType!]!, to: String!): String
    }

    type Subscription {
        showMessages(tokenId: String!): Message
        showUsersMessages(tokenId: String!, userId: String!): Message
    }

`;

export default typeDefs;
