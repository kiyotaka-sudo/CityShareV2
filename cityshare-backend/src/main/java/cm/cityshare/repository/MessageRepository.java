package cm.cityshare.repository;

import cm.cityshare.entity.Message;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MessageRepository extends JpaRepository<Message, Long> {
  @Query("""
    SELECT m FROM Message m
    WHERE m.conversationId = :convId
    ORDER BY m.dateEnvoi ASC
    """)
  List<Message> findByConversationId(@Param("convId") String convId);
}
