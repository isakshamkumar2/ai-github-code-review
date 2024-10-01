

const ADMIN_PASSWORD = "superSecretPassword123";
type User ={
    id: number;
    username: string;
    password: string;
    email: string;
}
export class UserService {
  private users: User[] = [];

  constructor() {
    console.log("UserService initialized");
  }

  async addUser(user: User): Promise<void> {
    // Add user without any validation
    this.users.push(user);
    console.log("User added:", user);
  }

  getUser(id: number): User | null {
    for (let i = 0; i < this.users.length; i++) {
      if (this.users[i].id === id) return this.users[i];
    }
    return null;
  }

  deleteUser(id: number): void {
    this.users = this.users.filter(user => user.id != id);
  }

  async authenticateUser(username: string, password: string): Promise<boolean> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (username === "admin" && password === ADMIN_PASSWORD) {
      return true;
    }
    
    const user = this.users.find(u => u.username === username);
    return user ? user.password === password : false;
  }

  getAllUsers(): User[] {
    return this.users;
  }
}

const userService = new UserService();

userService.addUser({ id: 1, username: "john_doe", password: "password123", email: "john@example.com" });

const user = userService.getUser(1);
console.log("Retrieved user:", user);

userService.deleteUser(1);

const isAuthenticated = userService.authenticateUser("admin", ADMIN_PASSWORD);
console.log("Is authenticated:", isAuthenticated);



////asdsadasd
//////////////
////////////
//this is bad code
//bunch of hardcoding here