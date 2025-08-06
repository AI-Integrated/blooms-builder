import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, Wifi, WifiOff } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  color: string;
  cursor?: { x: number; y: number };
}

interface CollaborationIndicatorProps {
  users: User[];
  isConnected: boolean;
  currentUser: User | null;
}

export const CollaborationIndicator: React.FC<CollaborationIndicatorProps> = ({
  users,
  isConnected,
  currentUser
}) => {
  const otherUsers = users.filter(user => user.id !== currentUser?.id);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {isConnected ? (
          <Wifi className="h-4 w-4 text-green-500" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-500" />
        )}
        <span className="text-sm text-muted-foreground">
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {otherUsers.length > 0 && (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <div className="flex -space-x-2">
            {otherUsers.slice(0, 3).map((user) => (
              <Avatar
                key={user.id}
                className="h-8 w-8 border-2 border-background"
                style={{ borderColor: user.color }}
              >
                <AvatarFallback
                  className="text-xs font-medium text-white"
                  style={{ backgroundColor: user.color }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
            {otherUsers.length > 3 && (
              <Badge variant="secondary" className="ml-2">
                +{otherUsers.length - 3}
              </Badge>
            )}
          </div>
          <span className="text-sm text-muted-foreground">
            {otherUsers.length === 1 ? '1 user' : `${otherUsers.length} users`} editing
          </span>
        </div>
      )}

      {/* Cursor indicators */}
      {otherUsers.map((user) => 
        user.cursor && (
          <div
            key={`cursor-${user.id}`}
            className="fixed pointer-events-none z-50"
            style={{
              left: user.cursor.x,
              top: user.cursor.y,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded-full border border-white"
                style={{ backgroundColor: user.color }}
              />
              <div
                className="px-2 py-1 rounded text-xs text-white whitespace-nowrap"
                style={{ backgroundColor: user.color }}
              >
                {user.name}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};