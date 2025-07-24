from flask import Blueprint, request, jsonify
from utils import driver, SECRET_KEY
import jwt

NODE_LABEL_USER = "notifications_usernode"
NODE_LABEL_NOTIFICATION = "notifications_notification"

notification_bp = Blueprint("notifications", __name__)

@notification_bp.route("/", methods=["POST", "OPTIONS"])
def create_notification():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    # 🔐 Extract token
    auth_header = request.headers.get("Authorization")
    print("[DEBUG] Auth header (create_notification):", auth_header)
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"error": "Unauthorized"}), 401
    token = auth_header.split(" ")[1]
    print("[DEBUG] Token (create_notification):", token)
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        sender_email = payload["email"]
        sender_username = payload.get("username", "Unknown")  # ✅ Get username from token
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid token"}), 401

    # 📦 Request body
    data = request.json
    receiver_email = data.get("to")
    message = data.get("message")
    notif_type = data.get("type", "system")  

    if not receiver_email or not message:
        return jsonify({"error": "Missing required fields"}), 400

    try:
        def create_notification_tx(tx):
            tx.run(f"""
                MERGE (u:{NODE_LABEL_USER} {{email: $receiver}})
                CREATE (n:{NODE_LABEL_NOTIFICATION} {{
                    message: $message,
                    type: $type,
                    from_email: $from_email,
                    from_username: $from_username,
                    timestamp: datetime()
                }})
                CREATE (u)-[:HAS_NOTIFICATION]->(n)

                // Clean up old notifications after 20
                WITH u
                MATCH (u)-[r:HAS_NOTIFICATION]->(old:{NODE_LABEL_NOTIFICATION})
                WITH u, r, old ORDER BY old.timestamp DESC
                SKIP 20
                FOREACH (x IN CASE WHEN old IS NULL THEN [] ELSE [1] END | DELETE r, old)
            """, 
                receiver=receiver_email,
                message=message,
                type=notif_type,
                from_email=sender_email,
                from_username=sender_username
            )

        with driver.session() as session:
            session.write_transaction(create_notification_tx)

        return jsonify({"message": "Notification sent successfully"}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# 📥 Get latest 20 notifications
@notification_bp.route("/fetch", methods=["GET", "OPTIONS"])
def get_notifications():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"error": "Unauthorized"}), 401
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_email = payload["email"]
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid token"}), 401

    with driver.session() as session:
        result = session.run(f"""
            MATCH (u:{NODE_LABEL_USER} {{email: $email}})-[:HAS_NOTIFICATION]->(n:{NODE_LABEL_NOTIFICATION})
            RETURN n.message AS message, 
                   toString(n.timestamp) AS timestamp, 
                   n.type AS type, 
                   n.from_username AS sender,
                   n.from_email AS sender_email
            ORDER BY n.timestamp DESC
            LIMIT 20
        """, email=user_email)

        notifications = [record.data() for record in result]
        return jsonify(notifications), 200

@notification_bp.route("/mark-handled", methods=["POST", "OPTIONS"])
def mark_notification_handled():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    auth_header = request.headers.get("Authorization")
    print("[DEBUG] Auth header (mark_notification_handled):", auth_header)
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"error": "Unauthorized"}), 401
    token = auth_header.split(" ")[1]
    print("[DEBUG] Token (mark_notification_handled):", token)
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        creator_email = payload["email"]
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid token"}), 401

    data = request.json
    requester_name = data.get("requester")
    community = data.get("community")
    decision = data.get("decision")

    if not requester_name or not community or decision not in ("accept", "reject"):
        return jsonify({"error": "Missing or invalid data"}), 400

    with driver.session() as session:
        # ✅ Build the new message
        new_msg = f"You {decision}ed a request"
        new_type = "system"

        session.run(f"""
            MATCH (u:{NODE_LABEL_USER} {{email: $creator_email}})-[:HAS_NOTIFICATION]->(n:{NODE_LABEL_NOTIFICATION})
            WHERE n.message CONTAINS $community AND n.from_username = $requester_name AND n.type = 'join_request'
            SET n.message = $new_msg
            SET n.type = $new_type
            SET n.timestamp = datetime()

        """, creator_email=creator_email, community=community, requester_name=requester_name, new_msg=new_msg, new_type = new_type)

    return jsonify({"message": "Notification updated"}), 200
