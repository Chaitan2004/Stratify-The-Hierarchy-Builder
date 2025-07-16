from flask import Blueprint, request, jsonify
from neo4j import GraphDatabase
import os
import jwt
import requests


community_bp = Blueprint("community", __name__)
SECRET_KEY = os.getenv("SECRET_KEY")


driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "chaitan26"))
# 🔍 Get user details
@community_bp.route("/user-details", methods=["GET"])
def get_user_details():
    token = request.cookies.get("token")
    if not token:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        email = payload.get("email")
        username = payload.get("username")
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid token"}), 401

    with driver.session(database="communities") as session:
        result = session.run("""
            MERGE (u:UserNode {email: $email})
            ON CREATE SET u.public_email = $email
            ON CREATE SET u.username = $username
            RETURN u
        """, email=email, username= username)

        record = result.single()
        user_node = record["u"]
        user_data = {
            "name": user_node.get("name"),
            "public_email": user_node.get("public_email"),
            "dob": user_node.get("dob"),
            "age": user_node.get("age"),
            "phone": user_node.get("phone"),
            "gender": user_node.get("gender"),
            "location": user_node.get("location"),
            "bio": user_node.get("bio"),
            "linkedin": user_node.get("linkedin"),
            "github": user_node.get("github"),
            "twitter": user_node.get("twitter"),
            "website": user_node.get("website")
        }
        return jsonify(user_data), 200

# ✏️ Update user details
@community_bp.route("/update-user", methods=["POST"])
def update_user():
    token = request.cookies.get("token")
    if not token:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        email = payload.get("email")
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid token"}), 401

    data = request.json
    if "email" in data:
        del data["email"]  # Prevent changing private email key

    if "public_email" in data:
        new_public_email = data["public_email"]
    else:
        new_public_email = None

    query = """
    MERGE (u:UserNode {email: $email})
    SET u += $data
    """
    if new_public_email:
        query += "\nSET u.public_email = $public_email"
    query += "\nRETURN u"

    with driver.session(database="communities") as session:
        try:
            session.run(query, email=email, data=data, public_email=new_public_email)
            return jsonify({"message": "Profile updated successfully"}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        
@community_bp.route("/register", methods=["POST"])
def register_community():
    token = request.cookies.get("token")
    if not token:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        creator_email = payload.get("email")
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid token"}), 401

    data = request.json
    name = data.get("name")
    level = data.get("level")
    motto = data.get("motto")

    if not name or not level or not motto:
        return jsonify({"error": "Missing required fields"}), 400

    # Level to size map
    level_to_size = {
        "1": 10,
        "2": 20,
        "3": 30,
        "4": -1  # Unlimited, premium later
    }
    max_size = level_to_size.get(level)
    if max_size is None:
        return jsonify({"error": "Invalid level"}), 400

    with driver.session(database="communities") as session:
        try:
            # ✅ Create community and link with creator
            session.run("""
                MERGE (u:UserNode {email: $creator_email})
                CREATE (c:Community {
                    name: $name,
                    level: $level,
                    motto: $motto,
                    max_size: $max_size,
                    created_at: datetime()
                })
                MERGE (u)-[:CREATED]->(c)
            """, creator_email=creator_email, name=name, level=level, motto=motto, max_size=max_size)


            return jsonify({"message": "Community registered successfully"}), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        
@community_bp.route("/search", methods=["GET"])
def search_communities():
    token = request.cookies.get("token")
    if not token:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        current_user = payload.get("email")
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid token"}), 401

    search = request.args.get("q", "").lower()

    with driver.session(database="communities") as session:
        result = session.run("""
            MATCH (c:Community)<-[:CREATED]-(u:UserNode)
            WHERE toLower(c.name) CONTAINS $search
            OPTIONAL MATCH (u2:UserNode {email: $current_user})
            OPTIONAL MATCH (u2)-[:MEMBER_OF]->(c)
            RETURN 
                c.name AS name,
                c.level AS level,
                c.motto AS motto,
                u.name AS creator,
                EXISTS((u2)-[:MEMBER_OF]->(c)) AS is_member,
                u.email = $current_user AS is_creator
            ORDER BY c.name
        """, search=search, current_user=current_user)

        communities = []
        for record in result:
            communities.append({
                "name": record["name"],
                "level": record["level"],
                "motto": record["motto"],
                "creator": record["creator"],
                "canJoin": not (record["is_member"] or record["is_creator"])
            })

        return jsonify(communities), 200
    
@community_bp.route("/join", methods=["POST"])
def request_join():
    token = request.cookies.get("token")
    if not token:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_email = payload["email"]
        username = payload["username"]
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid token"}), 401

    data = request.json
    community_name = data.get("community")
    if not community_name:
        return jsonify({"error": "Community name is required"}), 400

    try:
        with driver.session(database="communities") as session:
            # Step 1: Check all conditions and get creator email
            result = session.run("""
                MATCH (c:Community {name: $name})<-[:CREATED]-(creator:UserNode)
                OPTIONAL MATCH (u:UserNode {email: $email})-[:REQUESTED]->(c)
                OPTIONAL MATCH (u)-[:MEMBER_OF]->(c)
                RETURN 
                    creator.email AS creator_email,
                    u IS NOT NULL AND EXISTS((u)-[:REQUESTED]->(c)) AS already_requested,
                    EXISTS((u)-[:MEMBER_OF]->(c)) AS already_member,
                    creator.email = $email AS is_creator
            """, name=community_name, email=user_email)

            record = result.single()
            if not record:
                return jsonify({"error": "Community not found"}), 404

            if record["already_requested"]:
                return jsonify({"error": "Already requested to join"}), 400
            if record["already_member"]:
                return jsonify({"error": "Already a member"}), 400
            if record["is_creator"]:
                return jsonify({"error": "You are the creator"}), 400

            creator_email = record["creator_email"]

            # Step 2: Create request relationship
            session.run("""
                MERGE (u:UserNode {email: $email})
                MERGE (c:Community {name: $name})
                MERGE (u)-[:REQUESTED]->(c)
            """, email=user_email, name=community_name)

            # Step 3: Fetch user's name for message
            name_result = session.run("""
                MATCH (u:UserNode {email: $email})
                RETURN u.name AS name
            """, email=user_email)

            name_record = name_result.single()
            full_name = name_record["name"] if name_record and name_record["name"] else "Unknown Person"

        # Step 4: Notify the creator
        message = f"{full_name} requested to join your community '{community_name}'"
        response = requests.post("http://localhost:5003/api/notify", json={
            "to": creator_email,
            "message": message,
            "type": "join_request"
        }, cookies={"token": token})

        if response.status_code != 201:
            print("Notification failed:", response.text)
            # Rollback request edge if notify fails
            with driver.session(database="communities") as session:
                session.run("""
                    MATCH (u:UserNode {email: $email})-[r:REQUESTED]->(c:Community {name: $name})
                    DELETE r
                """, email=user_email, name=community_name)

            return jsonify({"error": "Failed to notify the creator"}), 500

        return jsonify({"message": "Join request sent"}), 200

    except Exception as e:
        # Rollback on any exception
        try:
            with driver.session(database="communities") as session:
                session.run("""
                    MATCH (u:UserNode {email: $email})-[r:REQUESTED]->(c:Community {name: $name})
                    DELETE r
                """, email=user_email, name=community_name)
        except:
            pass

        return jsonify({"error": f"Request failed: {str(e)}"}), 500


    

@community_bp.route("/join-response", methods=["POST"])
def handle_join_response():
    token = request.cookies.get("token")
    if not token:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        creator_email = payload.get("email")
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid token"}), 401

    data = request.json
    requester = data.get("requester")   # username of the user who requested
    requester_email = data.get("requester_email")   # username of the user who requested
    community = data.get("community")   # name of the community
    decision = data.get("decision")     # 'accept' or 'reject'

    print(requester)

    if not requester or not community or decision not in ("accept", "reject"):
        return jsonify({"error": "Missing or invalid data"}), 400
    

    with driver.session(database="communities") as session:
        if decision == "accept":
            session.run("""
                MATCH (c:Community {name: $community})
                MATCH (r:UserNode {username: $requester})-[req:REQUESTED]->(c)
                DELETE req
                MERGE (r)-[:MEMBER_OF]->(c)
            """, community=community, requester=requester)
        else:
            session.run("""
                MATCH (c:Community {name: $community})
                MATCH (r:UserNode {username: $requester})-[req:REQUESTED]->(c)
                DELETE req
            """, community=community, requester=requester)

    # ✅ Send final notification to the requester
    message = f"Your request to join '{community}' was {'accepted' if decision == 'accept' else 'rejected'}"
    try:
        requests.post(
            "http://localhost:5003/api/notify",
            json={
                "to": requester_email,
                "message": message,
                "type": "system"
            },
            cookies={"token": token}
        )
    except Exception as e:
        print("Failed to notify user:", e)

    try:
        requests.post(
            "http://localhost:5003/api/notify/mark-handled",
            json={
                "requester": requester,
                "community": community,
                "decision": decision
            },
            cookies={"token": token}
        )
    except Exception as e:
        print("Failed to update original notification:", e)

    return jsonify({"message": f"User {decision}ed successfully"}), 200



