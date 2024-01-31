"use client";

import React, { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/components/context/auth-context";

import { Table } from "@/components/table/Table";
import CardMain from "@/components/CardMain";
import { customFetch } from "@/components/Functions";

import { project as columns } from "@/components/Columns";

export default function Project() {
  const router = useRouter();
  const auth = useContext(AuthContext);

  const [units, setUnits] = useState("");

  let projectId = 1;

  //Card options
  let cardOptions = {
    cardName: "Project",
    cardNameUA: `Проект № ${projectId}`,
    linkNew: `../project/new`,
    linkReport: `../project/report`,
  };
  let path = `/projects`;
  let projectPath = `/project`;
  let apiPath = `/api/projects`;
  useEffect(() => {
    customFetch(apiPath, auth.token, (data) => setUnits(data));
    return () => {};
  }, []);

  const rowRedirect = (cell) => {
    switch (cell.column.id) {
      case "unitStatus":
        router.push(`${path}/${cell.row.original._id}`);
        break;

      default:
        router.push(`${projectPath}/${cell.row.original.projectNumber}`);
        break;
    }
  };

  return (
    <>
      {units && (
        <CardMain cardReport={false} cardOptions={cardOptions}>
          <Table data={units} columns={columns} cellHelper={rowRedirect} />
        </CardMain>
      )}
    </>
  );
}
