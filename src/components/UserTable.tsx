import React, { useMemo } from "react";
import { FixedSizeList, type ListChildComponentProps } from "react-window";
import type { User } from "../lib/types";

type RowData = {
  users: User[];
  onDelete: (user: User) => void;
};

type UserTableProps = {
  rowData: RowData;
};

const ROW_HEIGHT = 56;
const MAX_LIST_HEIGHT = 360;

const TableBody = React.forwardRef<HTMLDivElement, React.HTMLProps<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="rowgroup"
      className={`user-table__body ${className ?? ""}`.trim()}
      {...props}
    />
  )
);

TableBody.displayName = "TableBody";

const UserRow = React.memo<ListChildComponentProps<RowData>>(
  ({ index, style, data }) => {
    const user = data.users[index];

    if (!user) {
      return null;
    }

    return (
      <div
        role="row"
        className="user-table__row"
        style={style}
        aria-rowindex={index + 2}
      >
        <div role="cell" className="user-table__cell user-table__cell--serial">
          {index + 1}
        </div>
        <div role="cell" className="user-table__cell">
          {user.name}
        </div>
        <div role="cell" className="user-table__cell">
          <a className="link" href={`mailto:${user.email}`}>
            {user.email}
          </a>
        </div>
        <div role="cell" className="user-table__cell">
          {user.address?.city ?? "—"}
        </div>
        <div role="cell" className="user-table__cell">
          {user.company?.name ?? "—"}
        </div>
        <div role="cell" className="user-table__cell user-table__cell--actions">
          <button
            type="button"
            className="button button--ghost"
            onClick={() => data.onDelete(user)}
            aria-label={`Delete ${user.name}`}
          >
            Delete
          </button>
        </div>
      </div>
    );
  }
);

UserRow.displayName = "UserRow";

const getRowKey = (index: number, data: RowData) => {
  const user = data.users[index];
  if (!user) {
    return `row-${index}`;
  }
  return user.id ?? user.email;
};

const UserTable: React.FC<UserTableProps> = ({ rowData }) => {
  const { users, onDelete } = rowData;
  const listHeight = useMemo(
    () => Math.min(users.length * ROW_HEIGHT, MAX_LIST_HEIGHT),
    [users.length]
  );
  const itemData = useMemo(() => ({ users, onDelete }), [users, onDelete]);

  return (
    <div className="table-card">
      <div
        className="user-table"
        role="table"
        aria-label="User list"
        aria-rowcount={users.length + 1}
        aria-colcount={6}
      >
        <div role="rowgroup" className="user-table__header">
          <div role="row" className="user-table__row" aria-rowindex={1}>
            <div role="columnheader" className="user-table__cell user-table__cell--serial">
              No.
            </div>
            <div role="columnheader" className="user-table__cell">
              Name
            </div>
            <div role="columnheader" className="user-table__cell">
              Email
            </div>
            <div role="columnheader" className="user-table__cell">
              City
            </div>
            <div role="columnheader" className="user-table__cell">
              Company
            </div>
            <div
              role="columnheader"
              className="user-table__cell user-table__cell--actions"
            >
              Actions
            </div>
          </div>
        </div>
        {users.length > 0 ? (
          <FixedSizeList
            height={listHeight}
            itemCount={users.length}
            itemSize={ROW_HEIGHT}
            width="100%"
            itemData={itemData}
            outerElementType={TableBody}
            itemKey={getRowKey}
            overscanCount={6}
          >
            {UserRow}
          </FixedSizeList>
        ) : (
          <p className="empty-state" role="status">
            No users match your search.
          </p>
        )}
      </div>
    </div>
  );
};

export default UserTable;
