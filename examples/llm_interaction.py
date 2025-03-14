"""
Example of how an LLM can interact with the Audius MCP server using Python.

This file demonstrates the patterns for calling tools, accessing resources,
and using prompts to provide comprehensive music-related functionality.
"""

import json
import requests

# Configuration for MCP server
MCP_SERVER_URL = "http://localhost:3000"  # Update with actual server URL

def call_tool(tool_name, arguments):
    """
    Call a tool on the MCP server.
    
    Args:
        tool_name: The name of the tool to call
        arguments: Dictionary of arguments to pass to the tool
    
    Returns:
        The response from the tool
    """
    request = {
        "method": "call_tool",
        "params": {
            "name": tool_name,
            "arguments": arguments
        }
    }
    
    # In a real implementation, you would send this to the MCP server
    # For demonstration, we're just returning the request structure
    return request

def get_prompt(prompt_name, arguments):
    """
    Get a prompt from the MCP server.
    
    Args:
        prompt_name: The name of the prompt to get
        arguments: Dictionary of arguments to pass to the prompt
    
    Returns:
        The prompt response with messages
    """
    request = {
        "method": "get_prompt",
        "params": {
            "name": prompt_name,
            "arguments": arguments
        }
    }
    
    # In a real implementation, you would send this to the MCP server
    # For demonstration, we're just returning the request structure
    return request

def read_resource(resource_uri):
    """
    Read a resource from the MCP server.
    
    Args:
        resource_uri: The URI of the resource to read (e.g., "audius://track/12345")
    
    Returns:
        The resource content
    """
    request = {
        "method": "read_resource",
        "params": {
            "uri": resource_uri
        }
    }
    
    # In a real implementation, you would send this to the MCP server
    # For demonstration, we're just returning the request structure
    return request

# Example: Basic search for tracks
def search_tracks_example():
    """Example of searching for tracks"""
    # The LLM should format the call like this:
    request = call_tool("search-tracks", {
        "query": "electronic dance music",
        "limit": 5
    })
    
    print("Search Tracks Request:")
    print(json.dumps(request, indent=2))
    
    # Example response that would be returned:
    example_response = {
        "content": [
            {
                "type": "text",
                "text": json.dumps({
                    "query": "electronic dance music",
                    "tracks": [
                        {
                            "id": "12345",
                            "title": "Summer Vibes",
                            "user": {"id": "789", "name": "DJ Awesome"},
                            "duration": 180,
                            "artwork": {"url": "https://example.com/artwork.jpg"},
                            # ...more track details
                        },
                        # ...more tracks
                    ]
                }, indent=2)
            }
        ]
    }
    
    print("\nExample Response:")
    print(json.dumps(example_response, indent=2))
    
    # The LLM should then use this data to provide a helpful response
    print("\nExample LLM response:")
    print("I found some electronic dance tracks for you. 'Summer Vibes' by DJ Awesome is a popular one.")

# Example: Get details about an artist and their music
def artist_profile_example():
    """Example of creating an artist profile using multiple tools"""
    # Step 1: Use the artist-profile prompt for a guided experience
    prompt_request = get_prompt("artist-profile", {
        "userId": "789",
        "includeConnections": True,
        "includePopularContent": True
    })
    
    print("Artist Profile Prompt Request:")
    print(json.dumps(prompt_request, indent=2))
    
    # Step 2: Get the artist's details
    user_request = call_tool("get-user", {
        "userId": "789"
    })
    
    # Step 3: Get the artist's tracks
    tracks_request = call_tool("get-user-tracks", {
        "userId": "789",
        "limit": 10
    })
    
    # Step 4: Get the artist's followers
    followers_request = call_tool("user-followers", {
        "userId": "789",
        "limit": 5
    })
    
    print("\nExample LLM comprehensive response:")
    print("DJ Awesome is an electronic music producer with 10,000 followers. Their most popular track is 'Summer Vibes'...")

# Example: Create a playlist based on user preferences
def create_playlist_example():
    """Example of creating a playlist with tracks"""
    # Step 1: Search for tracks matching the theme
    search_request = call_tool("advanced-search", {
        "query": "relaxing",
        "genres": ["Ambient", "Chillout"],
        "moods": ["Relaxing"],
        "limit": 10
    })
    
    print("Advanced Search Request:")
    print(json.dumps(search_request, indent=2))
    
    # Step 2: Create a new playlist
    create_playlist_request = call_tool("create-playlist", {
        "userId": "123",
        "playlistName": "Evening Relaxation",
        "description": "Calm ambient tracks for relaxing in the evening",
        "isPrivate": False
    })
    
    # Example response with the new playlist ID
    playlist_response = {
        "content": [
            {
                "type": "text",
                "text": json.dumps({
                    "playlistId": "456",
                    "message": "Playlist created successfully"
                })
            }
        ]
    }
    
    # Step 3: Add tracks to the playlist
    add_tracks_request = call_tool("add-tracks-to-playlist", {
        "userId": "123",
        "playlistId": "456",
        "trackIds": ["789", "101112", "131415"]
    })
    
    print("\nExample LLM response:")
    print("I've created a new playlist called 'Evening Relaxation' with 3 ambient tracks that are perfect for unwinding.")

# Example: Using resources
def resource_example():
    """Example of working with Audius resources"""
    # Reading a track resource
    track_resource_request = read_resource("audius://track/12345")
    
    print("Track Resource Request:")
    print(json.dumps(track_resource_request, indent=2))
    
    # Reading a user resource
    user_resource_request = read_resource("audius://user/789")
    
    # Reading a playlist resource
    playlist_resource_request = read_resource("audius://playlist/456")
    
    print("\nExample LLM response using resources:")
    print("I've found the track 'Summer Vibes' by DJ Awesome. It's a 3-minute electronic track with a tempo of 128 BPM.")

if __name__ == "__main__":
    # Run the examples
    print("\n=== SEARCH TRACKS EXAMPLE ===")
    search_tracks_example()
    
    print("\n\n=== ARTIST PROFILE EXAMPLE ===")
    artist_profile_example()
    
    print("\n\n=== CREATE PLAYLIST EXAMPLE ===")
    create_playlist_example()
    
    print("\n\n=== RESOURCE EXAMPLE ===")
    resource_example()