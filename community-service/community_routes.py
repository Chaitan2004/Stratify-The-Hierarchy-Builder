from flask import Blueprint, request, jsonify
from neo4j import GraphDatabase
import os
import jwt
import requests
from dotenv import load_dotenv

load_dotenv()

NOTIFY_URL = os.getenv("NOTIFY_URL")
COMMUNITY_URL = os.getenv("COMMUNITY_URL")
USER_URL = os.getenv("USER_URL")
FRONTEND_URL = os.getenv("FRONTEND_URL")

community_bp = Blueprint("community", __name__)
SECRET_KEY = os.getenv("SECRET_KEY")


driver = GraphDatabase.driver(
    os.getenv("NEO4J_URI"),
    auth=(os.getenv("NEO4J_USER"), os.getenv("NEO4J_PASSWORD"))
)
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
        response = requests.post(NOTIFY_URL + "/api/notify", json={
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
            NOTIFY_URL + "/api/notify",
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
            NOTIFY_URL + "/api/notify/mark-handled",
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


@community_bp.route("/my-communities", methods=["GET"])
def get_my_communities():
    token = request.cookies.get("token")
    if not token:
        return jsonify({"error": "Missing token"}), 401
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except Exception:
        return jsonify({"error": "Invalid token"}), 401
    username = payload.get("username")
    if not username:
        return jsonify({"error": "User not found in token"}), 401
    query = """
    MATCH (u:UserNode {username: $username})-[:CREATED|MEMBER_OF]->(c:Community)
    WITH DISTINCT c
    OPTIONAL MATCH (leader:UserNode)-[:CREATED]->(c)
    RETURN c, leader.username AS leader_username, leader.name AS leader
    """
    with driver.session(database="communities") as session:
        result = session.run(query, username=username)
        communities = []
        for record in result:
            c = record["c"]
            leader_username = record["leader_username"]
            leader_name = record["leader"]
            communities.append({
                "name": c.get("name"),
                "level": c.get("level"),
                "motto": c.get("motto"),
                "leader_username": leader_username,
                "leader": leader_name
            })
    return jsonify(communities)


@community_bp.route("/user/update-username", methods=["POST"])
def update_username_community():
    data = request.json
    email = data.get("email")
    new_username = data.get("new_username")
    if not email or not new_username:
        return jsonify({"error": "Both email and new_username are required"}), 400
    try:
        with driver.session(database="communities") as session:
            session.run(
                """
                MATCH (u:UserNode {email: $email})
                SET u.username = $new_username
                RETURN u
                """,
                email=email, new_username=new_username
            )
        return jsonify({"message": "Username updated in community service"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@community_bp.route("/leader-node-and-tree", methods=["GET"])
def get_leader_and_tree():
    community_name = request.args.get("community")
    if not community_name:
        return jsonify({"error": "Community name is required"}), 400
    with driver.session(database="communities") as session:
        # Get leader node
        leader_result = session.run(
            """
            MATCH (leader:UserNode)-[:CREATED]->(c:Community {name: $community_name})
            RETURN leader.username AS username, leader.email AS email, leader.name AS name
            """,
            community_name=community_name
        )
        leader = leader_result.single()
        if not leader:
            return jsonify({"error": "Leader not found"}), 404
        # Get all nodes involved in CHILD_OF relationships for this community
        nodes = {}
        rels = []
        result = session.run(
            """
            MATCH (u:UserNode)-[r:CHILD_OF {community: $community_name}]->(v:UserNode)
            RETURN u.username AS from_username, u.email AS from_email, u.name AS from_name,
                   v.username AS to_username, v.email AS to_email, v.name AS to_name
            """,
            community_name=community_name
        )
        for record in result:
            # Add both source and target nodes
            for key in [("from_username", "from_email", "from_name"), ("to_username", "to_email", "to_name")]:
                uname, email, name = record[key[0]], record[key[1]], record[key[2]]
                if uname and uname not in nodes:
                    nodes[uname] = {
                        "username": uname,
                        "email": email,
                        "name": name
                    }
            # Add relationship
            rels.append({
                "from": record["from_username"],
                "to": record["to_username"],
                "community": community_name
            })
        # Always include the leader node
        if leader["username"] not in nodes:
            nodes[leader["username"]] = {
                "username": leader["username"],
                "email": leader["email"],
                "name": leader["name"]
            }
        print("Leader:", leader)
        print("Nodes:", nodes)
        print("Relationships:", rels)
        return jsonify({
            "leader": dict(leader),
            "nodes": list(nodes.values()),
            "relationships": rels
        })


@community_bp.route("/create-child-of", methods=["POST"])
def create_child_of():
    data = request.json
    community_name = data.get("community")
    from_username = data.get("from")
    to_username = data.get("to")
    if not community_name or not from_username or not to_username:
        return jsonify({"error": "Missing required fields"}), 400
    try:
        with driver.session(database="communities") as session:
            session.run(
                """
                MATCH (from:UserNode {username: $from_username})
                MATCH (to:UserNode {username: $to_username})
                MATCH (c:Community {name: $community_name})
                MERGE (from)-[r:CHILD_OF {community: $community_name}]->(to)
                RETURN from, to, r
                """,
                from_username=from_username,
                to_username=to_username,
                community_name=community_name
            )
        return jsonify({"message": "CHILD_OF relationship created"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@community_bp.route("/delete-user-node", methods=["POST"])
def delete_user_node():
    data = request.json
    community_name = data.get("community")
    username = data.get("username")
    if not community_name or not username:
        return jsonify({"error": "Missing community or username"}), 400
    try:
        with driver.session(database="communities") as session:
            # Delete all CHILD_OF relationships from or to this user in this community
            session.run(
                """
                MATCH (u:UserNode {username: $username})
                OPTIONAL MATCH (u)-[r1:CHILD_OF {community: $community_name}]->()
                OPTIONAL MATCH ()-[r2:CHILD_OF {community: $community_name}]->(u)
                DELETE r1, r2
                """,
                username=username,
                community_name=community_name
            )
        return jsonify({"message": "Node and its relationships deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@community_bp.route("/get-user-details", methods=["GET"])
def get_user_details_by_username():
    username = request.args.get("username")
    if not username:
        return jsonify({"error": "Missing username"}), 400
    with driver.session(database="communities") as session:
        result = session.run(
            """
            MATCH (u:UserNode {username: $username})
            RETURN u
            """,
            username=username
        )
        record = result.single()
        if not record:
            return jsonify({"error": "User not found"}), 404
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

@community_bp.route("/delete-community", methods=["POST"])
def delete_community():
    data = request.json
    community_name = data.get("community")
    if not community_name:
        return jsonify({"error": "Missing community name"}), 400
    try:
        with driver.session(database="communities") as session:
            # Delete all CHILD_OF relationships with this community name
            session.run(
                """
                MATCH ()-[r:CHILD_OF {community: $community_name}]->()
                DELETE r
                """,
                community_name=community_name
            )
            # Delete the Community node and all relationships
            session.run(
                """
                MATCH (c:Community {name: $community_name})
                DETACH DELETE c
                """,
                community_name=community_name
            )
        return jsonify({"message": "Community and related relationships deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@community_bp.route("/members", methods=["GET"])
def get_community_members():
    community_name = request.args.get("community")
    if not community_name:
        return jsonify({"error": "Missing community name"}), 400
    with driver.session(database="communities") as session:
        # Get leader
        leader_result = session.run(
            """
            MATCH (u:UserNode)-[:CREATED]->(c:Community {name: $community_name})
            RETURN u.username AS username, u.name AS name
            """,
            community_name=community_name
        )
        leader = leader_result.single()
        # Get members
        members_result = session.run(
            """
            MATCH (u:UserNode)-[:MEMBER_OF]->(c:Community {name: $community_name})
            RETURN u.username AS username, u.name AS name
            """,
            community_name=community_name
        )
        members = [dict(record) for record in members_result]
        return jsonify({
            "leader": dict(leader) if leader else None,
            "members": members
        })

@community_bp.route("/remove-member", methods=["POST"])
def remove_member():
    data = request.json
    community_name = data.get("community")
    username = data.get("username")
    if not community_name or not username:
        return jsonify({"error": "Missing community or username"}), 400
    try:
        with driver.session(database="communities") as session:
            session.run(
                """
                MATCH (u:UserNode {username: $username})-[r:MEMBER_OF]->(c:Community {name: $community_name})
                DELETE r
                """,
                username=username,
                community_name=community_name
            )
        return jsonify({"message": "Member removed from community"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
