import time
import random
from locust import HttpUser, task, between

class LensVaultUser(HttpUser):
    # Simulates users waiting 1 to 3 seconds between actions
    wait_time = between(1, 3)
    
    def on_start(self):
        """
        Runs once when a simulated user starts. 
        We create a mock user and log them in to get an auth token.
        """
        # 1. Register a random mock user for this session
        self.email = f"loadtest_{random.randint(10000, 99999)}@example.com"
        self.password = "loadtest123"
        
        # We catch exceptions just in case the user already exists during rapid restarts
        with self.client.post("/api/auth/register", json={"email": self.email, "password": self.password}, catch_response=True) as response:
            if response.status_code in [201, 400]:
                response.success()

        # 2. Login to get the JWT token
        response = self.client.post(
            "/api/auth/token", 
            data={"username": self.email, "password": self.password}
        )
        
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            # Set the authorization header for all future requests from this user
            self.client.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            self.token = None

    @task(3)
    def view_timeline(self):
        """Simulates a user loading their main timeline (Testing < 2s requirement)"""
        if self.token:
            self.client.get("/api/photos/?page=1&limit=50", name="Load Timeline")

    @task(2)
    def search_vault(self):
        """Simulates a user searching metadata (Testing < 500ms requirement)"""
        if self.token:
            queries = ["type:photo", "camera:iPhone", "favourite:true", "vacation"]
            query = random.choice(queries)
            self.client.get(f"/api/search/?q={query}", name="Search Photos")

    @task(1)
    def view_albums(self):
        """Simulates a user browsing their albums"""
        if self.token:
            self.client.get("/api/albums/", name="Load Albums")
