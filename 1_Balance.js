import React, { useEffect, useState, useContext } from "react";

import { useNavigate } from "react-router-dom";
import { Spinner } from "react-bootstrap";

import ErrorAlert from "../../components/elements/ErrorAlert";
import { useHttpClient } from "../../components/hooks/http-hook";
import { AuthContext } from "../../components/context/auth-context";
import { ReactTable } from "../../components/TableSearch";
import CardMain from "../../components/CardMain";
import { NumberWithCommas } from "../../components/table/FormatedCell";
import { showColumn } from "../../components/Functions";

function Balance() {
  const [loadedFarming, setLoadedFarming] = useState();
  const [balances, setBalances] = useState();
  const { isLoading, error, sendRequest, clearError } = useHttpClient();
  const auth = useContext(AuthContext);
  const navigate = useNavigate();

  //Card options
  let cardOptions = { cardName: "Balance" };

  const onClickCellHandler = (cell) => {
    return {
      onClick: () => {
        navigate(`/balances/${cell.row.values.id}`);
      },
    };
  };

  useEffect(() => {
    let unmounted = false;
    const fetchFarming = async () => {
      try {
        const responseData = await sendRequest(
          process.env.REACT_APP_BACKEND_URL + "/farm",
          "GET",
          null,
          { Authorization: "Bearer " + auth.token }
        );

        if (!unmounted) setLoadedFarming(responseData.farms);
      } catch (err) {}
    };
    fetchFarming();

    const fetchBalances = async () => {
      try {
        const responseData = await sendRequest(
          process.env.REACT_APP_BACKEND_URL + "/balance",
          "GET",
          null,
          { Authorization: "Bearer " + auth.token }
        );

        if (!unmounted) setBalances(responseData.balances);
      } catch (err) {}
    };
    fetchBalances();

    return () => {
      unmounted = true;
    };
  }, [sendRequest, auth.token]);

  //Window size cut colomn
  let show = showColumn(window.innerWidth, 1300);

  const columns = [
    {
      Header: "Id",
      accessor: "id",
      show: false,
    },
    {
      Header: "Date",
      accessor: "date",
      disableFilters: true,
      Cell: ({ row }) => new Date(row.values.date).toLocaleDateString("en-GB"),
    },
    {
      Header: "Client",
      accessor: "clientName",
    },
    {
      Header: "Balance",
      accessor: "totalBalance",
      disableFilters: true,
      Cell: ({ row }) => (
        <div
          style={{
            fontWeight: "bold",
          }}
        >
          {`${NumberWithCommas(row.values.totalBalance)} $`}
        </div>
      ),
    },
    {
      Header: "Wallet",
      accessor: "wallet",
      disableFilters: true,
      Cell: ({ row }) => (
        <div>{`${NumberWithCommas(row.values.wallet)} $`}</div>
      ),
    },
    {
      Header: "WalletInv",
      accessor: "walletInvest",
      disableFilters: true,
      Cell: ({ row }) => (
        <div>{`${NumberWithCommas(row.values.walletInvest)} $`}</div>
      ),
    },

    {
      Header: "Exchanges",
      accessor: "exchange",
      disableFilters: true,
      Cell: ({ row }) => (
        <div>{`${NumberWithCommas(row.values.exchange)} $`}</div>
      ),
    },
    {
      Header: "Farming",
      accessor: "farming",
      disableFilters: true,
      show,
      Cell: ({ row }) => (
        <div>{`${NumberWithCommas(row.values.farming)} $`}</div>
      ),
    },
    {
      Header: "Lending",
      accessor: "lending",
      disableFilters: true,
      show,
      Cell: ({ row }) => (
        <div>{`${NumberWithCommas(row.values.lending)} $`}</div>
      ),
    },
    {
      Header: "Harvestings",
      accessor: "harvesting",
      show,
      disableFilters: true,
      Cell: ({ row }) => (
        <div>{`${NumberWithCommas(row.values.harvesting)} $`}</div>
      ),
    },
    {
      Header: "Offsets",
      accessor: "offsets",
      show,
      disableFilters: true,
      Cell: ({ row }) => (
        <div>{`${NumberWithCommas(row.values.offsets)} $`}</div>
      ),
    },
    {
      Header: "Comments",
      accessor: "comments",
      show,
    },

    {
      Header: "userId",
      accessor: "userid",
      show: false,
    },
  ];

  return (
    <>
      <ErrorAlert error={error} onClear={clearError} />
      {isLoading && <Spinner animation="border" />}

      {!isLoading && loadedFarming && balances && (
        <CardMain cardReport={false} cardName={cardOptions.cardName}>
          <ReactTable
            columns={columns}
            data={balances}
            getCellProps={onClickCellHandler}
          />
        </CardMain>
      )}
    </>
  );
}

export default Balance;
