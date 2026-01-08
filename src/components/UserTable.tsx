import React from "react";
import type { User } from "../lib/types";

type UserTableProps = {
  users: User[];
  onDelete: (user: User) => void;
};

const UserTable: React.FC<UserTableProps> = ({ users, onDelete }) => {
  return (
    <div className="table-card">
      <table className="user-table">
        <caption className="sr-only">User list</caption>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Email</th>
            <th scope="col">City</th>
            <th scope="col">Company</th>
            <th scope="col" className="actions-col">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={`${user.email}-${user.id ?? "user"}`}>
              <td>{user.name}</td>
              <td>
                <a className="link" href={`mailto:${user.email}`}>
                  {user.email}
                </a>
              </td>
              <td>{user.address?.city ?? "—"}</td>
              <td>{user.company?.name ?? "—"}</td>
              <td>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => onDelete(user)}
                  aria-label={`Delete ${user.name}`}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {users.length === 0 && (
        <p className="empty-state" role="status">
          No users match your search.
        </p>
      )}
    </div>
  );
};

export default UserTable;
