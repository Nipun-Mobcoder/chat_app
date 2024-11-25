import { withFilter } from "graphql-subscriptions";

import activeUsers from "../../index.js";
import { getUserFromToken } from "../../utils/jwt.js";
import pubsub from "../../utils/pubsub.js";

const statusResolver = {
    Query: {
        status: async (_parent: any, {}, context: { token: string }) => {
          const userData: { id: string, userName: string } = await getUserFromToken(context.token);
          const targetId = userData.id;
    
          const userIndex = activeUsers.findIndex((user) => user.to === targetId);
    
          if (userIndex > -1)
            activeUsers[userIndex].isActive = true;
          else 
            activeUsers.push({ to: targetId, isActive: true });
    
          pubsub.publish('isActive', { showStatus: activeUsers });
          return `${userData.userName} is currently active.`
        },
        typingStatus: async (_parent: any, { isTyping, to }: { isTyping: boolean, to: string }, context: {token: string}) => {
          const userData: { id: string, userName: string } = await getUserFromToken(context.token);
          pubsub.publish('isTyping', { isTyping: { id: userData.id, isTyping, to }, id: userData.id, to })
          return `${userData.userName} is ${ isTyping ? 'is typing.': "is not typing." }`
        }
    },
    Subscription: {
        showStatus: {
            subscribe: 
              () => pubsub.asyncIterator(['isActive']) 
          },
        isTyping: {
            subscribe: withFilter(
                () => pubsub.asyncIterator('isTyping'),
                async (payload, variables) => {
                    const userData : { id: string, userName: string } = await getUserFromToken(variables.tokenId);
                    return ( payload.to === userData.id && payload.id === variables.userId );
                }
            )
        }
    }
}

export default statusResolver;