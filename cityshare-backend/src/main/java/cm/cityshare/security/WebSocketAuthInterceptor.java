package cm.cityshare.security;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements ChannelInterceptor {
  private final JwtTokenProvider jwtTokenProvider;
  private final CustomUserDetailsService userDetailsService;

  @Override
  public Message<?> preSend(Message<?> message, MessageChannel channel) {
    StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
    if (accessor == null || accessor.getCommand() == null) {
      return message;
    }
    if (StompCommand.CONNECT.equals(accessor.getCommand())) {
      String token = resolveBearerToken(accessor);
      if (token != null && jwtTokenProvider.validateToken(token)) {
        String telephone = jwtTokenProvider.getTelephone(token);
        UserDetails details = userDetailsService.loadUserByUsername(telephone);
        UsernamePasswordAuthenticationToken authentication =
            new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities());
        accessor.setUser(authentication);
      }
    }
    return message;
  }

  private String resolveBearerToken(StompHeaderAccessor accessor) {
    String auth = accessor.getFirstNativeHeader("Authorization");
    if (auth == null) {
      auth = accessor.getFirstNativeHeader("authorization");
    }
    if (auth != null && auth.startsWith("Bearer ")) {
      return auth.substring(7);
    }
    return null;
  }
}
